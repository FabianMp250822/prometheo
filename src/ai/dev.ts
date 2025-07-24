'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-payment-suggestions.ts';
import '@/ai/flows/summarize-text.ts';
import '@/ai/flows/generate-legal-document.ts';
