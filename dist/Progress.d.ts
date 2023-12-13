type Options = {
    debug: boolean;
    step: number;
    start: number;
    end: number;
};
export type ProgressOptions = Partial<Options>;
declare function Progress(this: any, options: ProgressOptions): {
    exports: {};
};
export default Progress;
