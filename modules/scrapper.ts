import axios from 'axios';
import cheerio from 'cheerio';

export class Scrapper {
  private url: string | null;
  private urls: string[];
  private contents: string[];
  private crawl: boolean;

  constructor(url: string | null = null, contents: string[] = [], crawl: boolean = false) {
    this.url = url;
    this.urls = [];
    this.contents = contents;
    this.crawl = crawl;
  }

  clean(): string[] {
    const contents: string[] = [];

    for (const content of this.contents) {
      const $ = cheerio.load(content);

      $('script, style').remove();

      const cleaned = $.text();
      const lines = cleaned.split('\n').map(line => line.trim());
      const chunks = lines.flatMap(line => line.split('  ').map(phrase => phrase.trim()));
      contents.push(chunks.filter(chunk => chunk).join('\n'));
    }

    return contents;
  }

  async getURLs(): Promise<string[]> {
    const urls: string[] = [];
    if (this.url && /^(mailto:|tel:)/.test(this.url)) {
      return urls;
    }

    if (this.url) {
      const { data: content } = await axios.get(this.url);
      const $ = cheerio.load(content);
      $('a').each((_, link) => {
        const href = $(link).attr('href');
        if (href) {
          if (!href.startsWith('http') && !href.startsWith('mailto:')) {
            urls.push(new URL(href, this.url).href);
          } else {
            urls.push(href);
          }
        }
      });
    }

    return urls;
  }

  async getText(): Promise<{ text: string[]; urls: string[] }> {
    const urls = await this.getURLs();
    const contents: string[] = [];
    if (this.crawl) {
      for (const url of urls) {
        try {
          if (url && !/^(mailto:|tel:)/.test(url)) {
            const { data: content } = await axios.get(url);
            contents.push(content);
          }
        } catch (error) {
          // Handle error
        }
      }
    } else {
      if (this.url && !/^(mailto:|tel:)/.test(this.url)) {
        const { data: content } = await axios.get(this.url);
        contents.push(content);
      }
    }
    const cleanedContents = new Scrapper(null, contents).clean();
    return { text: cleanedContents, urls };
  }
}
