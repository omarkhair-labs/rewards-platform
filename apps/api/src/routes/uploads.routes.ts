import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../auth.js';
import { createProofUpload } from '../storage.js';

const router=Router();

const schema=z.object({
  filename:z.string().trim().min(1).max(255),
  contentType:z.enum(['image/png','image/jpeg','image/webp','application/pdf']),
  contentLength:z.coerce.number().int().positive().max(10*1024*1024)
});

router.post('/proof',requireAuth,async(req:AuthedRequest,res)=>{
  const input=schema.parse(req.body);
  const result=await createProofUpload({
    userId:req.auth!.userId,
    filename:input.filename,
    contentType:input.contentType,
    contentLength:input.contentLength
  });
  res.status(201).json(result);
});

export default router;
