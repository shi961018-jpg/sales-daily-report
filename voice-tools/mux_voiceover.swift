import AVFoundation
import Foundation

if CommandLine.arguments.count != 4 {
    fputs("Usage: swift mux_voiceover.swift <video> <audio> <output>\n", stderr)
    exit(2)
}

let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let audioURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])

try? FileManager.default.removeItem(at: outputURL)

let videoAsset = AVURLAsset(url: videoURL)
let audioAsset = AVURLAsset(url: audioURL)
let composition = AVMutableComposition()

guard
    let sourceVideoTrack = videoAsset.tracks(withMediaType: .video).first,
    let compositionVideoTrack = composition.addMutableTrack(
        withMediaType: .video,
        preferredTrackID: kCMPersistentTrackID_Invalid
    )
else {
    fputs("No video track found.\n", stderr)
    exit(1)
}

try compositionVideoTrack.insertTimeRange(
    CMTimeRange(start: .zero, duration: videoAsset.duration),
    of: sourceVideoTrack,
    at: .zero
)
compositionVideoTrack.preferredTransform = sourceVideoTrack.preferredTransform

if
    let sourceAudioTrack = audioAsset.tracks(withMediaType: .audio).first,
    let compositionAudioTrack = composition.addMutableTrack(
        withMediaType: .audio,
        preferredTrackID: kCMPersistentTrackID_Invalid
    )
{
    let audioDuration = CMTimeMinimum(audioAsset.duration, videoAsset.duration)
    try compositionAudioTrack.insertTimeRange(
        CMTimeRange(start: .zero, duration: audioDuration),
        of: sourceAudioTrack,
        at: .zero
    )
} else {
    fputs("No audio track found.\n", stderr)
    exit(1)
}

guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
    fputs("Could not create export session.\n", stderr)
    exit(1)
}

exporter.outputURL = outputURL
exporter.outputFileType = .m4v
exporter.shouldOptimizeForNetworkUse = true

let semaphore = DispatchSemaphore(value: 0)
exporter.exportAsynchronously {
    semaphore.signal()
}
semaphore.wait()

switch exporter.status {
case .completed:
    print(outputURL.path)
case .failed, .cancelled:
    fputs(exporter.error?.localizedDescription ?? "Export failed.\n", stderr)
    exit(1)
default:
    fputs("Export ended with status \(exporter.status.rawValue).\n", stderr)
    exit(1)
}
