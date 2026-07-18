using System;
using System.IO;
using System.Net.Sockets;
using System.Threading.Tasks;

namespace WindowsApp.Core.Network
{
    public class FrameReceiver
    {
        private TcpClient? _client;
        private NetworkStream? _stream;
        private bool _isListening;

        public async Task StartListeningAsync(string ip, int port, Action<byte[]> onFrameReceived)
        {
            _client = new TcpClient();
            await _client.ConnectAsync(ip, port);
            _stream = _client.GetStream();
            _isListening = true;

            _ = Task.Run(async () =>
            {
                byte[] lengthBuffer = new byte[4];

                while (_isListening)
                {
                    int bytesRead = await _stream.ReadAsync(lengthBuffer, 0, 4);
                    if (bytesRead < 4) break;

                    int frameLength = System.BitConverter.ToInt32(lengthBuffer, 0);
                    if (frameLength <= 0) continue;

                    byte[] frameBuffer = new byte[frameLength];
                    int totalBytesReceived = 0;

                    while (totalBytesReceived < frameLength)
                    {
                        int read = await _stream.ReadAsync(frameBuffer, totalBytesReceived, frameLength - totalBytesReceived);
                        if (read == 0) break;
                        totalBytesReceived += read;
                    }

                    onFrameReceived(frameBuffer);
                }
            });
        }

        public void Stop()
        {
            _isListening = false;
            _stream?.Close();
            _client?.Close();
        }
    }
}
