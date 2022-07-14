/* eslint-disable @typescript-eslint/no-explicit-any */
import checkmm from '../src/checkmm';
import { performance } from 'perf_hooks';

interface Timing {
    millisecondsTaken: number;
    callCount: number;
}

const timings: { [name: string]: Timing } = {};

type TimingPair = [name: string, timing: Timing];

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const skipKnownFn = (label: string) => false;

const isKnownAsyncFn = (label: string) =>
    label === 'loaddata' || label === 'main' || label === 'readfile' || label === 'readtokens';

for (const label in checkmm) {
    if (typeof (checkmm as any)[label] === 'function') {
        if (skipKnownFn(label)) {
            // duly skipped
        } else if (isKnownAsyncFn(label)) {
            (checkmm as any)[label] = createAsyncPerformanceMonitor((checkmm as any)[label]);
        } else {
            (checkmm as any)[label] = createPerformanceMonitor((checkmm as any)[label]);
        }
    }
}

const sort = (compareFn?: (a: TimingPair, b: TimingPair) => number) => {
    const arr: TimingPair[] = [];
    for (const label in timings) {
        arr.push([label, timings[label]]);
    }

    return arr.sort(compareFn);
};

checkmm.main(process.argv.slice(1)).then(exitCode => {
    process.exitCode = exitCode;

    const byCallCount: TimingPair[] = sort((a: TimingPair, b: TimingPair) => {
        return b[1].callCount - a[1].callCount;
    });
    const millisecondsTaken: TimingPair[] = sort((a: TimingPair, b: TimingPair) => {
        return b[1].millisecondsTaken - a[1].millisecondsTaken;
    });

    const padding = 60;

    for (let n = 0; n < byCallCount.length; ++n) {
        const label1 = byCallCount[n][0];
        const callCount1 = byCallCount[n][1].callCount;
        const taken1 = (byCallCount[n][1].millisecondsTaken / 1000).toFixed(2);
        const label2 = millisecondsTaken[n][0];
        const callCount2 = millisecondsTaken[n][1].callCount;
        const taken2 = (millisecondsTaken[n][1].millisecondsTaken / 1000).toFixed(2);
        console.log(
            `${label1} called ${callCount1} times in ${taken1} seconds.`.padStart(padding, ' ') +
                `${label2} called ${callCount2} times in ${taken2} seconds.`.padStart(padding, ' '),
        );
    }

    console.log();
});
