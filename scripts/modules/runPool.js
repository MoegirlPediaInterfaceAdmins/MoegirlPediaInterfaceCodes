/**
 * 以固定并发度执行任务：多个任务同时运行，单个任务失败不中断其余任务。
 * 包间并行调用它限制同时运行的包数——vitest 每个进程都会按可用核数开 worker，
 * 并发包数过多只会互相抢占 CPU。
 * @template T
 * @param {T[]} items 待处理项，按数组顺序取用
 * @param {number} limit 同时运行的任务数上限，小于 1 时按 1 处理
 * @param {(item: T) => Promise<void>} worker
 * @returns {Promise<{ item: T, error: unknown }[]>} 失败列表，空数组表示全部成功
 */
export const runPool = async (items, limit, worker) => {
    const queue = [...items];
    const failures = [];
    const run = async () => {
        while (queue.length > 0) {
            const item = queue.shift();
            try {
                await worker(item);
            } catch (error) {
                failures.push({ item, error });
            }
        }
    };
    const workerCount = Math.min(Math.max(1, limit), items.length);
    await Promise.all(Array.from({ length: workerCount }, run));
    return failures;
};
