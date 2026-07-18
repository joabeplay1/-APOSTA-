package com.mirror.core.data.streaming

import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.MediaCodec
import android.media.MediaCodecInfo
import android.media.MediaFormat
import android.media.projection.MediaProjection
import android.view.Surface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import java.nio.ByteBuffer

class ScreenEncoder(
    private val mediaProjection: MediaProjection,
    private val width: Int,
    private val height: Int,
    private val bitrate: Int = 4000000, // 4 Mbps para 1080p
    private val fps: Int = 60
) {
    private var mediaCodec: MediaCodec? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var isRunning = false

    suspend fun startStreaming(outputStream: OutputStream) = withContext(Dispatchers.IO) {
        val format = MediaFormat.createVideoFormat(MediaFormat.MIMETYPE_VIDEO_AVC, width, height).apply {
            setInteger(MediaFormat.KEY_COLOR_FORMAT, MediaCodecInfo.CodecCapabilities.COLOR_FormatSurface)
            setInteger(MediaFormat.KEY_BIT_RATE, bitrate)
            setInteger(MediaFormat.KEY_FRAME_RATE, fps)
            setInteger(MediaFormat.KEY_I_FRAME_INTERVAL, 1) // Baixa latência requer I-Frames frequentes
            setInteger(MediaFormat.KEY_LATENCY, 0) // Modo ultra-low latency (Android 11+)
        }

        mediaCodec = MediaCodec.createEncoderByType(MediaFormat.MIMETYPE_VIDEO_AVC).apply {
            configure(format, null, null, MediaCodec.CONFIGURE_FLAG_ENCODE)
            val inputSurface = createInputSurface()
            start()
            
            virtualDisplay = mediaProjection.createVirtualDisplay(
                "MirrorDisplay", width, height, 1,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_PUBLIC,
                inputSurface, null, null
            )
        }

        isRunning = true
        val bufferInfo = MediaCodec.BufferInfo()

        try {
            while (isRunning) {
                val outputBufferIndex = mediaCodec!!.dequeueOutputBuffer(bufferInfo, 10000)
                if (outputBufferIndex >= 0) {
                    val outputBuffer: ByteBuffer = mediaCodec!!.getOutputBuffer(outputBufferIndex) ?: continue
                    
                    // Extrai os dados NAL do H.264
                    val outData = ByteArray(bufferInfo.size)
                    outputBuffer.get(outData)
                    
                    // Envia o tamanho do frame + o payload do frame via TCP
                    outputStream.write(ByteBuffer.allocate(4).putInt(bufferInfo.size).array())
                    outputStream.write(outData)
                    outputStream.flush()

                    mediaCodec!!.releaseOutputBuffer(outputBufferIndex, false)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            stopStreaming()
        }
    }

    fun stopStreaming() {
        isRunning = false
        virtualDisplay?.release()
        mediaCodec?.stop()
        mediaCodec?.release()
    }
}
