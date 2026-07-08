import { app, BrowserWindow } from "electron";
import path from "path";

function createWindow() {

  const window = new BrowserWindow({
    width: 1400,
    height: 900,

    webPreferences: {
      preload: path.join(
        __dirname,
        "preload.js"
      )
    }
  });


  window.loadURL(
    "http://localhost:5173"
  );

}


app.whenReady()
.then(() => {

  createWindow();

});
