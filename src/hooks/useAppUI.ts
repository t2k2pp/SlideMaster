import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { generateSlideContent } from '../../services/ai/unifiedAIService';
import { Presentation, SlideGenerationRequest } from '../../types';
import { createVersionMetadata } from '../../utils/versionManager';
import { DEFAULT_PRESENTATION_SETTINGS } from '../../constants';

const extractJsonFromString = (str: string): string | null => {
  const match = str.match(/\{.*\}/s);
  return match ? match[0] : null;
};

export const useAppUI = (logic: any) => {
  const { setAppState } = logic;
  const [isProcessing, setIsProcessing] = useState(false);

  const generateSlides = useCallback(async (request: SlideGenerationRequest): Promise<Presentation | null> => {
    setIsProcessing(true);
    try {
      // 統一AIサービスを使用してスライドコンテンツを生成
      const rawResponse = await generateSlideContent(request.topic, request.slideCount);
      const jsonString = extractJsonFromString(rawResponse);

      if (!jsonString) {
        throw new Error('No valid JSON found in AI response');
      }

      const presentationData = JSON.parse(jsonString) as Partial<Presentation>;
      if (!presentationData.slides || !presentationData.title) {
        throw new Error('Invalid presentation structure in the received JSON.');
      }

      const versionMetadata = createVersionMetadata();
      const finalPresentation: Presentation = {
        id: `presentation-${Date.now()}`,
        title: presentationData.title,
        description: presentationData.description || '',
        theme: 'professional',
        slides: presentationData.slides,
        settings: presentationData.settings || DEFAULT_PRESENTATION_SETTINGS,
        ...versionMetadata,
      };

      toast.success('スライドが正常に生成されました！');
      return finalPresentation;

    } catch (error) {
      console.error('Error generating slides:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast.error(`スライド生成に失敗しました: ${errorMessage}`);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    generateSlides,
  };
};