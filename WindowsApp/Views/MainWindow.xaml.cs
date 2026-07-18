using System.Windows;
using System.Windows.Input;
using WindowsApp.ViewModels;

namespace WindowsApp.Views
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            DataContext = new MainViewModel();
        }

        private void StreamRenderer_MouseDown(object sender, MouseButtonEventArgs e)
        {
            var point = e.GetPosition(StreamRenderer);
            double normalizedX = point.X / StreamRenderer.ActualWidth;
            double normalizedY = point.Y / StreamRenderer.ActualHeight;

            if (DataContext is MainViewModel vm)
            {
                vm.SendCommand(0x01, normalizedX, normalizedY);
            }
        }

        private void StreamRenderer_MouseMove(object sender, MouseEventArgs e)
        {
            if (e.LeftButton == MouseButtonState.Pressed)
            {
                var point = e.GetPosition(StreamRenderer);
                double normalizedX = point.X / StreamRenderer.ActualWidth;
                double normalizedY = point.Y / StreamRenderer.ActualHeight;

                if (DataContext is MainViewModel vm)
                {
                    vm.SendCommand(0x02, normalizedX, normalizedY);
                }
            }
        }

        private void StreamRenderer_MouseUp(object sender, MouseButtonEventArgs e)
        {
            var point = e.GetPosition(StreamRenderer);
            double normalizedX = point.X / StreamRenderer.ActualWidth;
            double normalizedY = point.Y / StreamRenderer.ActualHeight;

            if (DataContext is MainViewModel vm)
            {
                vm.SendCommand(0x03, normalizedX, normalizedY);
            }
        }
    }
}
