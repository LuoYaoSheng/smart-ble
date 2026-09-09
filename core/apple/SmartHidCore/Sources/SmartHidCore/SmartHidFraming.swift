import Foundation

public enum HidFraming {
    public static let frameHeaderSize = 3
    public static let maxChunkBytes = 128
    public static let maxAssembledBytes = 1024
    public static let maxFrames = 64
    public static let defaultAttMtu = 23

    public enum FramingError: Error, LocalizedError, Equatable, Sendable {
        case emptyPayload
        case tooLarge(Int)
        case tooManyFrames(Int)

        public var errorDescription: String? {
            switch self {
            case .emptyPayload:
                return "framing: payload 为空"
            case .tooLarge(let count):
                return "framing: payload \(count)B 超过 \(HidFraming.maxAssembledBytes)B"
            case .tooManyFrames(let count):
                return "framing: 需 \(count) 帧 > \(HidFraming.maxFrames)"
            }
        }
    }

    public static func chunkSize(forMtu mtu: Int) -> Int {
        guard mtu >= defaultAttMtu else {
            return defaultAttMtu - frameHeaderSize - 3
        }
        return max(1, min(maxChunkBytes, mtu - frameHeaderSize - 3))
    }

    public static func buildFrames(_ bytes: [UInt8], chunkSize: Int) throws -> [[UInt8]] {
        guard !bytes.isEmpty else { throw FramingError.emptyPayload }
        guard bytes.count <= maxAssembledBytes else { throw FramingError.tooLarge(bytes.count) }

        let chunk = max(1, min(maxChunkBytes, chunkSize))
        let total = (bytes.count + chunk - 1) / chunk
        guard total <= maxFrames else { throw FramingError.tooManyFrames(total) }

        return (0..<total).map { sequence in
            let offset = sequence * chunk
            let length = min(chunk, bytes.count - offset)
            var frame = [UInt8(sequence), UInt8(total), UInt8(length)]
            frame.append(contentsOf: bytes[offset..<(offset + length)])
            return frame
        }
    }
}
