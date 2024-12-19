import { Injectable } from '@nestjs/common'
import { PointHistory, TransactionType, UserPoint } from './point.model'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'


@Injectable()
export class PointService {
    constructor(
        private readonly userDb: UserPointTable,
        private readonly historyDb: PointHistoryTable,
    ) {}

    async getUserPoint(userId: number): Promise<UserPoint> {
        // 데이터 조회
        return this.userDb.selectById(userId)
    }

    async getUserHistories(userId: number): Promise<PointHistory[]> {
        // 데이터 조회
        return this.historyDb.selectAllByUserId(userId)
    }

    async chargeUserPoint(userId: number, amount: number): Promise<UserPoint> {
        // 데이터 조회
        const userPoint = await this.userDb.selectById(userId)
        const newAmount = userPoint.point + amount

        // 데이터 반영
        const updatedData = await this.userDb.insertOrUpdate(userId, newAmount)
        
        // [+히스토리] 유저ID, 포인트량, 작업종류, 작업시간
        await this.historyDb.insert(
            userId,
            amount,
            TransactionType.CHARGE,
            updatedData.updateMillis,
        )
        return updatedData
    }

    async useUserPoint(userId: number, amount: number): Promise<UserPoint> {
        // 데이터 조회
        const userPoint = await this.userDb.selectById(userId)
        const newAmount = userPoint.point - amount

        // [예외1] 잔고 부족
        if (newAmount < 0) {
            throw new Error('포인트의 잔고가 부족합니다.')
        }

        // 데이터 반영
        const updatedData = await this.userDb.insertOrUpdate(userId, newAmount)

        // [+히스토리] 유저ID, 포인트량, 작업종류, 작업시간
        await this.historyDb.insert(
            userId,
            amount,
            TransactionType.USE,
            updatedData.updateMillis,
        )
        return updatedData
    }
}
