import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service.js';
import {
  CreateCampaignSchema,
  BackCampaignSchema,
  QueryCampaignsSchema,
} from '../schemas/campaign.schema.js';

export class CampaignController {
  async listCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const parsedQuery = QueryCampaignsSchema.parse(req.query);
      const result = await campaignService.getCampaigns(parsedQuery);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  async getCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const campaign = await campaignService.getCampaignById(id);
      return res.json({ success: true, data: campaign });
    } catch (error) {
      return next(error);
    }
  }

  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = CreateCampaignSchema.parse(req.body);
      const newCampaign = await campaignService.createCampaign(validatedInput);
      return res.status(201).json({ success: true, data: newCampaign });
    } catch (error) {
      return next(error);
    }
  }

  async backCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedInput = BackCampaignSchema.parse({
        ...req.body,
        campaignId: req.params.id,
      });
      const result = await campaignService.backCampaign(validatedInput);
      return res.json({ success: true, data: result });
    } catch (error) {
      return next(error);
    }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await campaignService.getPlatformMetrics();
      return res.json({ success: true, data: metrics });
    } catch (error) {
      return next(error);
    }
  }
}

export const campaignController = new CampaignController();
