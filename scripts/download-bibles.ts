#!/usr/bin/env bun

import fs from 'fs';
import path from 'path';

interface BookInfo {
  name: string;
  chapters: number;
  slug: string;
}

// Complete canonical book list with chapter counts
const BOOKS: BookInfo[] = [
  { name: 'Genesis', chapters: 50, slug: 'genesis' },
  { name: 'Exodus', chapters: 40, slug: 'exodus' },
  { name: 'Leviticus', chapters: 27, slug: 'leviticus' },
  { name: 'Numbers', chapters: 36, slug: 'numbers' },
  { name: 'Deuteronomy', chapters: 34, slug: 'deuteronomy' },
  { name: 'Joshua', chapters: 24, slug: 'joshua' },
  { name: 'Judges', chapters: 21, slug: 'judges' },
  { name: 'Ruth', chapters: 4, slug: 'ruth' },
  { name: '1 Samuel', chapters: 31, slug: '1-samuel' },
  { name: '2 Samuel', chapters: 24, slug: '2-samuel' },
  { name: '1 Kings', chapters: 22, slug: '1-kings' },
  { name: '2 Kings', chapters: 25, slug: '2-kings' },
  { name: '1 Chronicles', chapters: 29, slug: '1-chronicles' },
  { name: '2 Chronicles', chapters: 36, slug: '2-chronicles' },
  { name: 'Ezra', chapters: 10, slug: 'ezra' },
  { name: 'Nehemiah', chapters: 13, slug: 'nehemiah' },
  { name: 'Esther', chapters: 10, slug: 'esther' },
  { name: 'Job', chapters: 42, slug: 'job' },
  { name: 'Psalms', chapters: 150, slug: 'psalms' },
  { name: 'Proverbs', chapters: 31, slug: 'proverbs' },
  { name: 'Ecclesiastes', chapters: 12, slug: 'ecclesiastes' },
  { name: 'Song of Solomon', chapters: 8, slug: 'song-of-solomon' },
  { name: 'Isaiah', chapters: 66, slug: 'isaiah' },
  { name: 'Jeremiah', chapters: 52, slug: 'jeremiah' },
  { name: 'Lamentations', chapters: 5, slug: 'lamentations' },
  { name: 'Ezekiel', chapters: 48, slug: 'ezekiel' },
  { name: 'Daniel', chapters: 12, slug: 'daniel' },
  { name: 'Hosea', chapters: 14, slug: 'hosea' },
  { name: 'Joel', chapters: 3, slug: 'joel' },
  { name: 'Amos', chapters: 9, slug: 'amos' },
  { name: 'Obadiah', chapters: 1, slug: 'obadiah' },
  { name: 'Jonah', chapters: 4, slug: 'jonah' },
  { name: 'Micah', chapters: 7, slug: 'micah' },
  { name: 'Nahum', chapters: 3, slug: 'nahum' },
  { name: 'Habakkuk', chapters: 3, slug: 'habakkuk' },
  { name: 'Zephaniah', chapters: 3, slug: 'zephaniah' },
  { name: 'Haggai', chapters: 2, slug: 'haggai' },
  { name: 'Zechariah', chapters: 14, slug: 'zechariah' },
  { name: 'Malachi', chapters: 4, slug: 'malachi' },
  { name: 'Matthew', chapters: 28, slug: 'matthew' },
  { name: 'Mark', chapters: 16, slug: 'mark' },
  { name: 'Luke', chapters: 24, slug: 'luke' },
  { name: 'John', chapters: 21, slug: 'john' },
  { name: 'Acts', chapters: 28, slug: 'acts' },
  { name: 'Romans', chapters: 16, slug: 'romans' },
  { name: '1 Corinthians', chapters: 16, slug: '1-corinthians' },
  { name: '2 Corinthians', chapters: 13, slug: '2-corinthians' },
  { name: 'Galatians', chapters: 6, slug: 'galatians' },
  { name: 'Ephesians', chapters: 6, slug: 'ephesians' },
  { name: 'Philippians', chapters: 4, slug: 'philippians' },
  { name: 'Colossians', chapters: 4, slug: 'colossians' },
  { name: '1 Thessalonians', chapters: 5, slug: '1-thessalonians' },
  { name: '2 Thessalonians', chapters: 3, slug: '2-thessalonians' },
  { name: '1 Timothy', chapters: 6, slug: '1-timothy' },
  { name: '2 Timothy', chapters: 4, slug: '2-timothy' },
  { name: 'Titus', chapters: 3, slug: 'titus' },
  { name: 'Philemon', chapters: 1, slug: 'philemon' },
  { name: 'Hebrews', chapters: 13, slug: 'hebrews' },
  { name: 'James', chapters: 5, slug: 'james' },
  { name: '1 Peter', chapters: 5, slug: '1-peter' },
  { name: '2 Peter', chapters: 3, slug: '2-peter' },
  { name: '1 John', chapters: 5, slug: '1-john' },
  { name: '2 John', chapters: 1, slug: '2-john' },
  { name: '3 John', chapters: 1, slug: '3-john' },
  { name: 'Jude', chapters: 1, slug: 'jude' },
  { name: 'Revelation', chapters: 22, slug: 'revelation' },
];

interface DownloadTask {
  translation: string;
  book: BookInfo;
  chapter: number;
  outputPath: string;
  url: string;
}

interface DownloadStats {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  bytesDownloaded: number;
}

class ParallelBibleDownloader {
  private baseUrl = 'https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles';
  private dataDir: string;
  private concurrency: number;
  private stats: Map<string, DownloadStats> = new Map();
  private failedDownloads: DownloadTask[] = [];
  private startTime: number = 0;

  constructor(dataDir: string, concurrency: number = 8) {
    this.dataDir = dataDir;
    this.concurrency = concurrency;
  }

  private log(message: string): void {
    console.log(message);
  }

  private async fetchWithRetry(url: string, retries: number = 3): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'bibleterm-downloader/1.0 (educational project)',
          },
        });
        
        if (response.ok) return response;
        
        // Don't retry 404s
        if (response.status === 404) {
          throw new Error(`Not found: ${url}`);
        }
        
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      
      if (i < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  private generateTasks(translation: string): DownloadTask[] {
    const tasks: DownloadTask[] = [];
    const translationDir = path.join(this.dataDir, `en-${translation}`);
    
    for (const book of BOOKS) {
      const bookDir = path.join(translationDir, book.slug);
      
      for (let chapter = 1; chapter <= book.chapters; chapter++) {
        const outputPath = path.join(bookDir, `${chapter}.json`);
        const url = `${this.baseUrl}/en-${translation}/books/${book.slug}/chapters/${chapter}.json`;
        
        tasks.push({
          translation,
          book,
          chapter,
          outputPath,
          url,
        });
      }
    }
    
    return tasks;
  }

  private async downloadTask(task: DownloadTask, stats: DownloadStats): Promise<void> {
    // Skip if already exists and is valid
    if (fs.existsSync(task.outputPath)) {
      try {
        const content = fs.readFileSync(task.outputPath, 'utf-8');
        const data = JSON.parse(content);
        if (data && Array.isArray(data.data)) {
          stats.skipped++;
          stats.completed++;
          return;
        }
      } catch {
        // Invalid JSON, re-download
      }
    }

    try {
      const response = await this.fetchWithRetry(task.url);
      const content = await response.text();
      const data = JSON.parse(content);
      
      // Validate structure
      if (!data || !Array.isArray(data.data)) {
        throw new Error('Invalid JSON structure');
      }
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(task.outputPath), { recursive: true });
      
      // Write with proper formatting
      fs.writeFileSync(task.outputPath, JSON.stringify(data, null, 2));
      
      stats.completed++;
      stats.bytesDownloaded += content.length;
    } catch (error) {
      stats.failed++;
      this.failedDownloads.push(task);
    }
  }

  private async processBatch(tasks: DownloadTask[], stats: DownloadStats): Promise<void> {
    const executing: Promise<void>[] = [];
    
    for (const task of tasks) {
      const promise = this.downloadTask(task, stats).then(() => {
        this.printProgress(stats);
      });
      
      executing.push(promise);
      
      if (executing.length >= this.concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex(p => p === promise),
          1
        );
      }
    }
    
    await Promise.all(executing);
  }

  private printProgress(stats: DownloadStats): void {
    const elapsed = Date.now() - this.startTime;
    const rate = stats.completed / (elapsed / 1000);
    const remaining = stats.total - stats.completed;
    const eta = rate > 0 ? Math.round(remaining / rate) * 1000 : 0;
    
    const percent = ((stats.completed / stats.total) * 100).toFixed(1);
    const bar = this.renderProgressBar(parseFloat(percent));
    
    process.stdout.write(`\r${bar} ${percent}% | ${stats.completed}/${stats.total} | ${stats.failed > 0 ? `⚠️ ${stats.failed} failed | ` : ''}ETA: ${this.formatDuration(eta)}     `);
  }

  private renderProgressBar(percent: number, width: number = 30): string {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  async downloadTranslation(translation: string): Promise<void> {
    this.log(`\n📖 Downloading ${translation.toUpperCase()}...`);
    
    const tasks = this.generateTasks(translation);
    const stats: DownloadStats = {
      total: tasks.length,
      completed: 0,
      failed: 0,
      skipped: 0,
      bytesDownloaded: 0,
    };
    
    this.stats.set(translation, stats);
    
    await this.processBatch(tasks, stats);
    
    // Clear progress line
    process.stdout.write('\n');
    
    // Print summary
    const successRate = ((stats.completed - stats.failed) / stats.total * 100).toFixed(1);
    this.log(`   ✅ ${stats.completed - stats.failed}/${stats.total} chapters (${successRate}%)`);
    if (stats.skipped > 0) {
      this.log(`   ⏭️  ${stats.skipped} already cached`);
    }
    if (stats.failed > 0) {
      this.log(`   ⚠️  ${stats.failed} failed`);
    }
    this.log(`   💾 ${this.formatBytes(stats.bytesDownloaded)} downloaded`);
  }

  async downloadAll(translations: string[]): Promise<void> {
    this.startTime = Date.now();
    
    this.log('='.repeat(70));
    this.log('📚 Parallel Bible Downloader');
    this.log(`Source: wldeh/bible-api (jsDelivr CDN)`);
    this.log(`Concurrency: ${this.concurrency} parallel downloads`);
    this.log(`Output: ${this.dataDir}`);
    this.log('='.repeat(70));
    
    for (const translation of translations) {
      await this.downloadTranslation(translation);
    }
    
    const totalTime = Date.now() - this.startTime;
    const totalStats = Array.from(this.stats.values()).reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        completed: acc.completed + s.completed,
        failed: acc.failed + s.failed,
        skipped: acc.skipped + s.skipped,
        bytesDownloaded: acc.bytesDownloaded + s.bytesDownloaded,
      }),
      { total: 0, completed: 0, failed: 0, skipped: 0, bytesDownloaded: 0 }
    );
    
    this.log('\n' + '='.repeat(70));
    this.log('📊 Download Summary');
    this.log('='.repeat(70));
    this.log(`Total chapters: ${totalStats.total}`);
    this.log(`Successful: ${totalStats.completed - totalStats.failed}`);
    if (totalStats.skipped > 0) {
      this.log(`Cached (skipped): ${totalStats.skipped}`);
    }
    if (totalStats.failed > 0) {
      this.log(`Failed: ${totalStats.failed}`);
    }
    this.log(`Total size: ${this.formatBytes(totalStats.bytesDownloaded)}`);
    this.log(`Duration: ${this.formatDuration(totalTime)}`);
    this.log(`Average speed: ${(totalStats.completed / (totalTime / 1000)).toFixed(1)} chapters/sec`);
    this.log('='.repeat(70));
    
    // Retry failed downloads once
    if (this.failedDownloads.length > 0) {
      this.log(`\n🔄 Retrying ${this.failedDownloads.length} failed downloads...`);
      const retryTasks = [...this.failedDownloads];
      this.failedDownloads = [];
      
      const retryStats: DownloadStats = {
        total: retryTasks.length,
        completed: 0,
        failed: 0,
        skipped: 0,
        bytesDownloaded: 0,
      };
      
      await this.processBatch(retryTasks, retryStats);
      process.stdout.write('\n');
      
      if (retryStats.failed === 0) {
        this.log('   ✅ All retries successful');
      } else {
        this.log(`   ⚠️  ${retryStats.failed} downloads still failed`);
        
        // Save failed list for manual retry
        const failedLog = path.join(this.dataDir, 'failed-downloads.json');
        fs.writeFileSync(failedLog, JSON.stringify(this.failedDownloads, null, 2));
        this.log(`   📝 Failed URLs saved to: ${failedLog}`);
      }
    }
  }
}

// Main execution
const TRANSLATIONS = ['asv', 'kjv', 'web', 'ylt'];
const DATA_DIR = path.resolve(import.meta.dir, '..', 'data');

// Parse CLI args
const args = process.argv.slice(2);
const concurrencyArg = args.find(arg => arg.startsWith('--concurrency='));
const concurrency = concurrencyArg ? parseInt(concurrencyArg.split('=')[1], 10) : 8;

const specificTranslation = args.find(arg => !arg.startsWith('--'));
const translations = specificTranslation 
  ? [specificTranslation.toLowerCase()]
  : TRANSLATIONS;

const downloader = new ParallelBibleDownloader(DATA_DIR, concurrency);
downloader.downloadAll(translations).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});