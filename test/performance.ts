/* eslint-disable @typescript-eslint/no-explicit-any */
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
        const returnValue: any = fn(...args);
        const finish = performance.now();

        timings[name].callCount++;
        timings[name].millisecondsTaken += finish - start;

        if (typeof returnValue === 'object' && returnValue.then) {
            throw new Error(`createPerformanceMonitor called on function ${name} returning promise`);
        }

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
        const promise = fn(...args);
        const returnValue = await promise;
        const finish = performance.now();

        if (!promise.then) {
            throw new Error(`createAsyncPerformanceMonitor called on function ${name} not returning a promise`);
        }

        timings[name].callCount++;
        timings[name].millisecondsTaken += finish - start;

        return returnValue;
    };
};

const isKnownAsyncFn = (label: string) =>
    label === 'loaddata' || label === 'main' || label === 'readfile' || label === 'readtokens';

for (const label in checkmm) {
    if (typeof (checkmm as any)[label] === 'function') {
        if (isKnownAsyncFn(label)) {
            (checkmm as any)[label] = createAsyncPerformanceMonitor((checkmm as any)[label]);
        } else {
            (checkmm as any)[label] = createPerformanceMonitor((checkmm as any)[label]);
        }
    }
}

checkmm.main(process.argv.slice(1)).then(exitCode => {
    process.exitCode = exitCode;
    console.log(JSON.stringify(timings, null, 2));
});
