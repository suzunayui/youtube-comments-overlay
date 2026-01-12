# YouTube Overlay VirtualCam (Media Foundation) - Scaffold

This folder contains a C# .NET 8 console app skeleton to host a Media Foundation
Virtual Camera implementation on Windows 11.

## What works now
- `check` command: verifies whether the MF Virtual Camera API entry point is present.
- `register` / `unregister` commands: attempt to create or remove the virtual camera.

## What is NOT implemented yet
- Streaming frames into the virtual camera

## Build
```
dotnet build
```

## Run (check)
```
dotnet run -- check
```

## Register (admin recommended)
```
dotnet run -- register --name "YouTube Overlay VirtualCam" --source "youtube-overlay-virtualcam"
```

## Unregister (admin recommended)
```
dotnet run -- unregister --name "YouTube Overlay VirtualCam" --source "youtube-overlay-virtualcam"
```

## Next steps (to implement)
1) Wire `MFCreateVirtualCamera` and `IMFVirtualCamera` COM interfaces.
2) Register/unregister the virtual camera (requires admin privileges).
3) Implement a frame source (e.g., read from shared memory or capture a window).
4) Stream frames into the virtual camera.
