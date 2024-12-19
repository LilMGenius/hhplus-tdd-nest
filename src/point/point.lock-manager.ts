import { Injectable } from '@nestjs/common'
import { Mutex } from 'async-mutex'


@Injectable()
export class PointLockManager {
    // 동시성 제어용 Mutex Locks
    private userLocks = new Map<number, Mutex>()

    private getUserMutex(userId: number): Mutex {
        // Mutex Lock이 없으면 생성
        if (!this.userLocks.has(userId)) {
            this.userLocks.set(userId, new Mutex())
        }
        return this.userLocks.get(userId)
    }

    async runWithUserLock<T>(userId: number, fn: () => Promise<T>): Promise<T> {
        const m = this.getUserMutex(userId)
        const release = await m.acquire() // Mutex Lock 획득
        try {
            return await fn() // 비즈니스 로직 실행
        } finally {
            release() // Mutex Lock 해제
        }
    }
}
