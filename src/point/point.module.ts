import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { PointController } from './point.controller'
import { PointService } from './point.service'
import { PointLockManager } from './point.lock-manager'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'

@Module({
    imports: [DatabaseModule],
    controllers: [PointController],
    providers: [PointService, PointLockManager, UserPointTable, PointHistoryTable],
})
export class PointModule {}
