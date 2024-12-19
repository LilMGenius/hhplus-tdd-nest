import { Test, TestingModule } from '@nestjs/testing'
import { PointService } from './point.service'
import { PointLockManager } from './point.lock-manager'
import { TransactionType } from './point.model'
import { UserPointTable } from '../database/userpoint.table'
import { PointHistoryTable } from '../database/pointhistory.table'


describe('PointService', () => {
    let service: PointService;
    let userDbMock: Partial<UserPointTable>;
    let historyDbMock: Partial<PointHistoryTable>;

    beforeEach(async () => {
        // UserPointTable Mock
        userDbMock = {
            selectById: jest.fn(),
            insertOrUpdate: jest.fn(),
        };

        // PointHistoryTable Mock
        historyDbMock = {
            insert: jest.fn(),
            selectAllByUserId: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PointService,
                PointLockManager,
                { provide: UserPointTable, useValue: userDbMock },
                { provide: PointHistoryTable, useValue: historyDbMock },
            ],
        }).compile();

        // PointService Mock
        service = module.get<PointService>(PointService);
    })

    describe('getUserPoint', () => {
        it('존재하는 유저인 경우에만, 포인트 반환', async () => {
            (userDbMock.selectById as jest.Mock).mockResolvedValue({
                id: 1,
                point: 100,
                updateMillis: 1000,
            });

            const result = await service.getUserPoint(1);
            expect(result).toEqual({ id: 1, point: 100, updateMillis: 1000 });
            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
        })

        it('존재하지 않는 유저인 경우에는, 기본값(0) 반환', async () => {
            (userDbMock.selectById as jest.Mock).mockResolvedValue({
                id: 2,
                point: 0,
                updateMillis: 9999,
            });

            const result = await service.getUserPoint(2);
            expect(result.point).toBe(0);
            expect(userDbMock.selectById).toHaveBeenCalledWith(2);
        })
    })

    describe('getUserHistories', () => {
        it('유저의 히스토리(유저ID, 포인트량, 작업종류, 작업시간) 반환', async () => {
            const mockHistories = [
                {
                    id: 1,
                    userId: 1,
                    amount: 50,
                    type: TransactionType.CHARGE,
                    timeMillis: 1000000000,
                },
                {
                    id: 2,
                    userId: 1,
                    amount: 20,
                    type: TransactionType.USE,
                    timeMillis: 1000010000,
                },
            ];
            (historyDbMock.selectAllByUserId as jest.Mock).mockResolvedValue(mockHistories);

            const result = await service.getUserHistories(1);
            expect(result).toEqual(mockHistories);
            expect(historyDbMock.selectAllByUserId).toHaveBeenCalledWith(1);
        })
    })

    describe('chargeUserPoint', () => {
        it('유저의 포인트 충전 및 히스토리 추가', async () => {
            const initialUser = { id: 1, point: 123, updateMillis: 1000 };
            const chargedUser = { id: 1, point: 777, updateMillis: 2000 };

            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);
            (userDbMock.insertOrUpdate as jest.Mock).mockResolvedValue(chargedUser);
            (historyDbMock.insert as jest.Mock).mockResolvedValue({
                id: 1,
                userId: 1,
                amount: 654,
                type: TransactionType.CHARGE,
                timeMillis: 2000,
            });

            const result = await service.chargeUserPoint(1, 654);

            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
            expect(userDbMock.insertOrUpdate).toHaveBeenCalledWith(1, 777);
            expect(historyDbMock.insert).toHaveBeenCalledWith(
                1,
                654,
                TransactionType.CHARGE,
                2000,
            );

            expect(result).toEqual(chargedUser);
        })

        it('잔고 한도를 넘기는 경우에는, 예외(Throw) 발생', async () => {
            const initialUser = { id: 1, point: 999_999_999, updateMillis: 1000 };

            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);

            await expect(service.chargeUserPoint(1, 2)).rejects.toThrow('포인트의 한도를 초과하였습니다. (10억)');
            expect(userDbMock.insertOrUpdate).not.toHaveBeenCalled();
            expect(historyDbMock.insert).not.toHaveBeenCalled();
        })
    })

    describe('useUserPoint', () => {
        it('잔고가 충분한 경우에만, 유저의 포인트 사용 및 히스토리 추가', async () => {
            const initialUser = { id: 1, point: 100, updateMillis: 1000 };
            const usedUser = { id: 1, point: 70, updateMillis: 2000 };

            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);
            (userDbMock.insertOrUpdate as jest.Mock).mockResolvedValue(usedUser);
            (historyDbMock.insert as jest.Mock).mockResolvedValue({
                id: 2,
                userId: 1,
                amount: 30,
                type: TransactionType.USE,
                timeMillis: 2000,
            });

            const result = await service.useUserPoint(1, 30);

            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
            expect(userDbMock.insertOrUpdate).toHaveBeenCalledWith(1, 70);
            expect(historyDbMock.insert).toHaveBeenCalledWith(
                1,
                30,
                TransactionType.USE,
                2000,
            );

            expect(result).toEqual(usedUser);
        })

        it('잔고가 부족한 경우에는, 예외(Throw) 발생', async () => {
            const initialUser = { id: 1, point: 20, updateMillis: 1000 };
            (userDbMock.selectById as jest.Mock).mockResolvedValue(initialUser);

            await expect(service.useUserPoint(1, 30)).rejects.toThrow('포인트의 잔고가 부족합니다.');

            expect(userDbMock.selectById).toHaveBeenCalledWith(1);
            expect(userDbMock.insertOrUpdate).not.toHaveBeenCalled();
            expect(historyDbMock.insert).not.toHaveBeenCalled();
        })
    })
})
