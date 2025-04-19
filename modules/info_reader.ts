import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import * as socidExtractor from 'socid-extractor';

interface Content {
  text: string[];
  urls: string[];
}

interface SocialInfo {
  url: string;
  info: Record<string, string>;
}

export class InfoReader {
  private content: Content;
  private socialPath: string;
  private res: { phone: RegExp; email: RegExp };

  constructor(content: Content = { text: [], urls: [] }, socialPath: string = './socials.txt') {
    this.content = content;
    this.socialPath = socialPath;
    this.res = {
      phone: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,7}$/gm,
      email: /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/,
    };
  }

  getPhoneNumber(): string[] {
    const numbers: string[] = [];
    const texts: string[] = this.content.text;

    for (const text of texts) {
      for (let n of text.split('\n')) {
        if (this.res.phone.test(n)) {
          for (const letter of n.match(/[a-zA-Z]/g) || []) {
            n = n.replace(letter, '');
          }
          numbers.push(n);
        }
      }
    }

    return Array.from(new Set(numbers));
  }

  getEmails(): string[] {
    const emails: string[] = [];
    const texts: string[] = this.content.text;

    for (const text of texts) {
      for (const s of text.split('\n')) {
        if (this.res.email.test(s)) {
          emails.append(s);
        }
      }
    }

    for (const link of this.content.urls) {
      if (link && link.startsWith('mailto:')) {
        emails.push(link.replace('mailto:', ''));
      }
    }

    return Array.from(new Set(emails));
  }

  getSocials(): string[] {
    const smAccounts: string[] = [];
    const socials: string[] = fs.readFileSync(this.socialPath, 'utf-8').split('\n');

    for (const url of this.content.urls) {
      for (const s of socials) {
        if (url && url.toLowerCase().includes(s.trim().toLowerCase())) {
          smAccounts.push(url);
        }
      }
    }

    return Array.from(new Set(smAccounts));
  }

  async getSocialsInfo(): Promise<SocialInfo[]> {
    const urls = this.getSocials();
    const smInfo: SocialInfo[] = [];

    for (const url of urls) {
      try {
        const { text } = await socidExtractor.parse(url);
        const info = socidExtractor.extract(text);
        smInfo.push({ url, info });
      } catch (error) {
        // Handle error
      }
    }

    return smInfo;
  }
}
