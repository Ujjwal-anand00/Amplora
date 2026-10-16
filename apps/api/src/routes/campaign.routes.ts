import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';

const router = Router();

// Platform summary metrics
router.get('/metrics', (req, res, next) => campaignController.getMetrics(req, res, next));

// Campaign collection
router.get('/', (req, res, next) => campaignController.listCampaigns(req, res, next));
router.post('/', (req, res, next) => campaignController.createCampaign(req, res, next));

// Single campaign & backing
router.get('/:id', (req, res, next) => campaignController.getCampaign(req, res, next));
router.post('/:id/back', (req, res, next) => campaignController.backCampaign(req, res, next));

export default router;
