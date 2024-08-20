import duplexify from "duplexify";
import concatStream from "concat-stream";
import { Readable } from "node:stream";
import uglify from "uglify-js";

class ReadableFromString extends Readable {
    #string;
    #index = 0;
    /**
     * @param { string } string
     */
    constructor(string) {
        super();
        this.#string = string;
    }
    /**
     * @param { number } size
     */
    _read(size) {
        const index = this.#index;
        this.#index += size;
        const piece = this.#string.slice(index, this.#index);
        if (piece.length === 0) {
            this.push(null);
        } else {
            this.push(piece, "utf-8");
        }
    }
}

/**
 * @param { uglify.MinifyOptions } [opts]
 */
export default (opts) => {
    const stream = duplexify();

    const writer = concatStream({ encoding: "string" }, (source) => {
        const result = uglify.minify(source, opts);
        if (result.error) {
            stream.emit("error", result.error);
        } else {
            stream.setReadable(new ReadableFromString(result.code));
        }
    });

    stream.setWritable(writer);

    return stream;
};
