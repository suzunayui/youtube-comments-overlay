using System;

namespace YouTubeOverlayVirtualCam;

internal static class Program
{
    private static int Main(string[] args)
    {
        try
        {
            if (args.Length == 0)
            {
                PrintHelp();
                return 1;
            }

            var command = args[0].ToLowerInvariant();
            switch (command)
            {
                case "check":
                    return HandleCheck();
                case "register":
                    return HandleRegister(args);
                case "unregister":
                    return HandleUnregister(args);
                case "start":
                    return HandleNotImplemented("start");
                case "stop":
                    return HandleNotImplemented("stop");
                case "help":
                case "-h":
                case "--help":
                    PrintHelp();
                    return 0;
                default:
                    Console.Error.WriteLine($"Unknown command: {command}");
                    PrintHelp();
                    return 1;
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine(ex.ToString());
            Console.Error.WriteLine($"Fatal: {ex.GetType().Name} {ex.Message}");
            return 10;
        }
    }

    private static int HandleCheck()
    {
        var available = VirtualCamManager.IsMfVirtualCameraAvailable();
        Console.WriteLine(available
            ? "Media Foundation Virtual Camera API: available"
            : "Media Foundation Virtual Camera API: not available");
        return available ? 0 : 2;
    }

    private static int HandleRegister(string[] args)
    {
        var options = VirtualCamOptions.FromArgs(args);
        return VirtualCamManager.RegisterVirtualCamera(options);
    }

    private static int HandleUnregister(string[] args)
    {
        var options = VirtualCamOptions.FromArgs(args);
        return VirtualCamManager.UnregisterVirtualCamera(options);
    }

    private static int HandleNotImplemented(string name)
    {
        Console.Error.WriteLine($"'{name}' is not implemented yet.");
        Console.Error.WriteLine("Next step: wire frame source and streaming pipeline.");
        return 3;
    }

    private static void PrintHelp()
    {
        Console.WriteLine("YouTube Overlay VirtualCam (Media Foundation) - scaffold");
        Console.WriteLine("Usage:");
        Console.WriteLine("  youtube-overlay-virtualcam check");
        Console.WriteLine("  youtube-overlay-virtualcam register");
        Console.WriteLine("  youtube-overlay-virtualcam unregister");
        Console.WriteLine("  youtube-overlay-virtualcam start");
        Console.WriteLine("  youtube-overlay-virtualcam stop");
        Console.WriteLine();
        Console.WriteLine("Options (register/unregister):");
        Console.WriteLine("  --name \"Friendly Name\"");
        Console.WriteLine("  --source \"source-id\"");
        Console.WriteLine("  --lifetime session|system");
        Console.WriteLine("  --access current|all");
    }
}
