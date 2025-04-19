import * as fs from 'fs';
import * as path from 'path';
import * as arg from 'arg';
import axios from 'axios';
import { InfoReader } from './modules/info_reader';
import { Scrapper } from './modules/scrapper';

const banner = `
▄▄▄█████▓ ██░ ██ ▓█████   ██████  ▄████▄   ██▀███   ▄▄▄       ██▓███   ██▓███  ▓█████  ██▀███  
▓  ██▒ ▓▒▓██░ ██▒▓█   ▀ ▒██    ▒ ▒██▀ ▀█  ▓██ ▒ ██▒▒████▄    ▓██░  ██▒▓██░  ██▒▓█   ▀ ▓██ ▒ ██▒
▒ ▓██░ ▒░▒██▀▀██░▒███   ░ ▓██▄   ▒▓█    ▄ ▓██ ░▄█ ▒▒██  ▀█▄  ▓██░ ██▓▒▓██░ ██▓▒▒███   ▓██ ░▄█ ▒
░ ▓██▓ ░ ░▓█ ░██ ▒▓█  ▄   ▒   ██▒▒▓▓▄ ▄██▒▒██▀▀█▄  ░██▄▄▄▄██ ▒██▄█▓▒ ▒▒██▄█▓▒ ▒▒▓█  ▄ ▒██▀▀█▄  
  ▒██▒ ░ ░▓█▒░██▓░▒████▒▒██████▒▒▒ ▓███▀ ░░██▓ ▒██▒ ▓█   ▓██▒▒██▒ ░  ░▒██▒ ░  ░░▒████▒░██▓ ▒██▒
  ▒ ░░    ▒ ░░▒░▒░░ ▒░ ░▒ ▒▓▒ ▒ ░░ ░▒ ▒  ░░ ▒▓ ░▒▓░ ▒▒   ▓▒█░▒▓▒░ ░  ░▒▓▒░ ░  ░░░ ▒░ ░░ ▒▓ ░▒▓░
    ░     ▒ ░▒░ ░ ░ ░  ░░ ░▒  ░ ░  ░  ▒     ░▒ ░ ▒░  ▒   ▒▒ ░░▒ ░     ░▒ ░      ░ ░  ░  ░▒ ░ ▒░
  ░       ░  ░░ ░   ░   ░  ░  ░  ░          ░░   ░   ░   ▒   ░░       ░░          ░     ░░   ░ 
          ░  ░  ░   ░  ░      ░  ░ ░         ░           ░  ░                     ░  ░   ░     
                                 ░                                                            
`;

const args = arg({
  '--url': String,
  '--urls': String,
  '--crawl': Boolean,
  '--banner': Boolean,
  '--sm': Boolean,
  '--output': Boolean,
  '--verbose': Boolean,
  '-u': '--url',
  '-us': '--urls',
  '-c': '--crawl',
  '-b': '--banner',
  '-s': '--sm',
  '-o': '--output',
  '-v': '--verbose',
});

function verbPrint(content: string) {
  if (args['--verbose']) {
    console.log(content);
  }
}

let targetType = '';
if (!args['--url'] && !args['--urls']) {
  console.error('Please add --url or --urls');
  process.exit(1);
} else {
  if (args['--url']) {
    targetType = 'URL';
  } else {
    targetType = 'FILE';
  }
}

if (!args['--banner']) {
  console.log(banner);
}

if (targetType === 'URL') {
  if (!(args['--url'].startsWith('https://') || args['--url'].startsWith('http://'))) {
    args['--url'] = 'http://' + args['--url'];
  }

  console.log('*'.repeat(50) + '\n' + `Target: ${args['--url']}` + '\n' + '*'.repeat(50) + '\n');

  axios.get(args['--url']);

  const url = args['--url'];
  verbPrint('Scraping (and crawling) started');
  const scrap = new Scrapper(url, [], args['--crawl']);
  verbPrint('Scraping (and crawling) done\nReading and sorting information');
  scrap.getText().then((content) => {
    const IR = new InfoReader(content);
    const emails = IR.getEmails();
    const numbers = IR.getPhoneNumber();
    const sm = IR.getSocials();
    verbPrint('Reading and sorting information done');

    console.log('\n');
    console.log('E-Mails: ' + '\n - '.join(emails));
    console.log('Numbers:' + '\n - '.join(numbers));
    if (args['--sm']) {
      console.log('SocialMedia: ');
      IR.getSocialsInfo().then((smInfo) => {
        for (const x of smInfo) {
          const url = x.url;
          const info = x.info;
          if (info) {
            console.log(` - ${url}:`);
            for (const y in info) {
              console.log(`     - ${y}: ${info[y]}`);
            }
          } else {
            console.log(` - ${url}`);
          }
        }
      });
    } else {
      console.log('SocialMedia: ' + sm.join(', '));
    }
    if (args['--output']) {
      const out = {
        'E-Mails': emails,
        'SocialMedia': sm,
        'Numbers': numbers,
      };
      const fileName = url.toLowerCase().replace('http://', '').replace('https://', '').replace('/', '');
      fs.writeFileSync(`output/${fileName}.json`, JSON.stringify(out, null, 4));
    }
  });
} else if (targetType === 'FILE') {
  const out = [];
  const urls = fs.readFileSync(args['--urls'], 'utf-8').split('\n');
  for (let url of urls) {
    url = url.trim();
    console.log('\n\n');

    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }

    console.log('*'.repeat(50) + '\n' + `Target: ${url}` + '\n' + '*'.repeat(50) + '\n');

    axios.get(url);
    verbPrint('Scraping (and crawling) started');
    const scrap = new Scrapper(url, [], args['--crawl']);
    verbPrint('Scraping (and crawling) done\nReading and sorting information');
    scrap.getText().then((content) => {
      const IR = new InfoReader(content);
      const emails = IR.getEmails();
      const numbers = IR.getPhoneNumber();
      const sm = IR.getSocials();
      out.push({
        'Target': url,
        'E-Mails': emails,
        'SocialMedia': sm,
        'Numbers': numbers,
      });
      verbPrint('Reading and sorting information done');
      console.log('E-Mails:\n' + '\n - '.join(emails));
      console.log('Numbers:\n' + '\n - '.join(numbers));
      if (args['--sm']) {
        console.log('SocialMedia: ');
        IR.getSocialsInfo().then((smInfo) => {
          for (const x of smInfo) {
            const url = x.url;
            const info = x.info;
            if (info) {
              console.log(` - ${url}:`);
              for (const y in info) {
                console.log(`     - ${y}: ${info[y]}`);
              }
            } else {
              console.log(` - ${url}`);
            }
          }
        });
      } else {
        console.log('SocialMedia: ' + sm.join(', '));
      }
    });
  }

  if (args['--output']) {
    const fileName = args['--urls'].replace('/', '_');
    fs.writeFileSync(`output/${fileName}.json`, JSON.stringify(out, null, 4));
  }
}
