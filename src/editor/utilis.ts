import { Timing } from "../types";

export function forceDownload(href: string) {
    var anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = href;
    document.body.appendChild(anchor);
    anchor.click();
}

// assuming current intervals do not overlap
function sortIntervals(intervals: Timing[]) {
    return intervals.sort((intA, intB) => {
        const startA = intA.start;
        const endA = intB.end;

        const startB = intB.start;
        const endB = intB.end;

        if (startA > endB) {
            return 1
        }

        if (startB > endA) {
            return -1
        }

        return 0;
    })
}


export function isOverlapping(intervals: Timing[], newInterval: Timing) {
    const a = newInterval.start;
    const b = newInterval.end;

    for (const interval of intervals) {
        const c = interval.start;
        const d = interval.end;

        if (a < d && b > c) {
            console.log('This one overlap: ', newInterval);
            console.log('with interval: ', interval);
            console.log('----');
            return true;
        }
    }

    return false;
}

function isGoodInterval(interval: Timing) {
    let good = false;
    if (interval.start < interval.end) {
        good = true;
    }

    return good;
}

function addInterval(INTERVALS: Timing[] = [], interval: Timing) {
    if (!isGoodInterval(interval)) {
        console.log('This is not an interval');
        return;
    }

    if (!isOverlapping(INTERVALS, interval)) {
        INTERVALS.push(interval);

        // you may also want to keep those intervals sorted
        const sortedIntervals = sortIntervals(INTERVALS);
        console.log('Sorted intervals', sortedIntervals);
    }
}