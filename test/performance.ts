import checkmm from '../src/checkmm';
import { performance } from 'perf_hooks';

interface Timing {
    millisecondsTaken: number;
    callCount: number;
}

const timings: { [name: string]: Timing } = {};

const createPerformanceMonitor = <RT, Args extends Array<unknown>>(fn: (...args: Args) => RT, _name?: string) => {
    const name: string = _name ?? fn.name;

    timings[name] = { millisecondsTaken: 0, callCount: 0 };

    return (...args: Args): RT => {
        const start = performance.now();
        const returnValue = fn(...args);
        const finish = performance.now();

        timings[name].callCount++;
        timings[name].millisecondsTaken += finish - start;

        return returnValue;
    };
};

const createAsyncPerformanceMonitor = <RT, Args extends Array<unknown>>(
    fn: (...args: Args) => Promise<RT>,
    _name?: string,
) => {
    const name: string = _name ?? fn.name;

    timings[name] = { millisecondsTaken: 0, callCount: 0 };

    return async (...args: Args): Promise<RT> => {
        const start = performance.now();
        const returnValue = await fn(...args);
        const finish = performance.now();

        timings[name].callCount++;
        timings[name].millisecondsTaken += finish - start;

        return returnValue;
    };
};

checkmm.loaddata = createAsyncPerformanceMonitor(checkmm.loaddata);
checkmm.main = createAsyncPerformanceMonitor(checkmm.main);

checkmm.main(process.argv.slice(1)).then(exitCode => {
    process.exitCode = exitCode;
    console.log(JSON.stringify(timings, null, 2));
});
