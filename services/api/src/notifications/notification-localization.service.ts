import { Injectable } from '@nestjs/common';
import { NOTIFICATION_TEMPLATES, SupportedLocale } from './templates/localized-templates.js';

@Injectable()
export class NotificationLocalizationService {
  renderTemplate(
    templateKey: string,
    locale = 'en',
    params: Record<string, string> = {},
  ): { title: string; body: string } {
    const validLocale: SupportedLocale =
      locale === 'ta' || locale === 'hi' ? (locale as SupportedLocale) : 'en';

    const tpl = NOTIFICATION_TEMPLATES[templateKey];
    if (!tpl) {
      return {
        title: params.title || 'Notification',
        body: params.body || '',
      };
    }

    const localized = tpl[validLocale] || tpl.en;
    let title = localized.title;
    let body = localized.body;

    for (const [k, v] of Object.entries(params)) {
      title = title.replace(new RegExp(`{${k}}`, 'g'), v);
      body = body.replace(new RegExp(`{${k}}`, 'g'), v);
    }

    return { title, body };
  }
}
