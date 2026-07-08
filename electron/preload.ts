import { contextBridge } from "electron";


contextBridge.exposeInMainWorld(
  "buildCloud",
  {

    version: "1.0.0",

    hello(){

      return "BuildCloud conectado";

    }

  }
);
