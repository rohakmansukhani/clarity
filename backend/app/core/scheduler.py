from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.market_service import MarketService
import logging

logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.market_service = MarketService()

    def start(self):
        self.scheduler.add_job(self.refresh_popular_sectors, 'interval', minutes=15)
        self.scheduler.add_job(self.refresh_sector_mappings, 'interval', hours=24)
        self.scheduler.start()
        logger.info("✅ Scheduler Started")

    async def refresh_popular_sectors(self):
        """
        Background job to keep sector data fresh.
        """
        logger.info("Running job: refresh_popular_sectors")
        try:
            # Refresh top sectors (Auto, Bank, IT)
            sectors = ["AUTO", "BANK", "IT"]
            for sector in sectors:
                # This will trigger the caching mechanism in MarketService/SectorRecommender 
                # effectively 'warming' the cache.
                from app.services.recommendation.sector_recommender import SectorRecommender
                await SectorRecommender().get_top_picks(sector)
            logger.info("Job completed: refresh_popular_sectors")
        except Exception as e:
            logger.error(f"Job failed: {e}")

    async def refresh_sector_mappings(self):
        """
        Background job to keep sector mappings fresh.
        """
        logger.info("Running job: refresh_sector_mappings")
        try:
            from app.services.data.sector_mapper import SectorMapper
            sectors = ["AUTO", "IT", "BANK", "PHARMA", "METAL", "FMCG"]
            for sector in sectors:
                await SectorMapper().get_stocks_in_sector(sector)
            logger.info("Job completed: refresh_sector_mappings")
        except Exception as e:
            logger.error(f"Job failed: {e}")

scheduler = SchedulerService()
