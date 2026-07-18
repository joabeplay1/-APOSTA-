using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace WindowsApp.ViewModels
{
    public partial class MainViewModel : ObservableObject
    {
        [ObservableProperty]
        private string _connectionStatus = "Desconectado";

        public MainViewModel()
        {
            ConnectUsbCommand = new RelayCommand(ConnectUsb);
            ConnectWifiCommand = new RelayCommand(ConnectWifi);
        }

        public IRelayCommand ConnectUsbCommand { get; }
        public IRelayCommand ConnectWifiCommand { get; }

        private void ConnectUsb()
        {
            ConnectionStatus = "Conectado via USB (Porta 8080)";
            // Inicializar lógica de envio/recebimento aqui
        }

        private void ConnectWifi()
        {
            ConnectionStatus = "Buscando rede...";
        }

        public void SendCommand(byte eventType, double x, double y)
        {
            // Abstração para empacotar o buffer binário customizado [Tipo, X, Y]
            System.Diagnostics.Debug.WriteLine($"Comando enviado: Tipo {eventType} em X:{x:F2} Y:{y:F2}");
        }
    }
}
