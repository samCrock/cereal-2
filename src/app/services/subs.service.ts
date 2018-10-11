import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ElectronService } from 'ngx-electron';
import { HttpClient } from '@angular/common/http';
import * as cheerio from 'cheerio';
import { ResponseContentType } from '@angular/http';

@Injectable()
export class SubsService {

  private local_path = this._electronService.remote.getGlobal('local_path');
  private fsExtra = this._electronService.remote.getGlobal('fsExtra');
  private zip = this._electronService.remote.getGlobal('zip');
  private app = this._electronService.remote.getGlobal('app');
  private path = this._electronService.remote.getGlobal('path');


  constructor(
    private _electronService: ElectronService,
    private http: HttpClient
  ) {
    // console.log('local_path', this.local_path);
  }

  retrieveSubs(show, ep_label, dn) {
    return Observable.create(observer => {
      dn = dn.replace(/'/g, ' ');
      const url = 'https://subscene.com/subtitles/release?q=' + dn;
      console.log(url);
      return this.http.get < any[] > (url, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response);
          const results = [];
          $('tr').map((i, element) => {
            if (i > 0) {
              const sub_name = element.children[1].children[1].children[3].children[0].data.trim(),
                link = element.children[1].children[1].attribs.href,
                lang = element.children[1].children[1].children[1].children[0].data.trim();

              const similarity = this.similarity(dn, sub_name);
              if (lang === 'English' && similarity > 0.5 && sub_name.indexOf(show.split(' ')[0]) > -1 && sub_name.indexOf(ep_label) > -1) {
                console.log('Sub candidate', sub_name);
                results.push({
                  dn: dn,
                  i: i.toString(),
                  sub: sub_name,
                  link: link,
                  lang: lang,
                  similarity: similarity
                });
              }
            }
          });
          const subs = results.sort(this.compare).slice(-1).pop();
          if (!subs) { return; }
          // console.log('results', results);
          observer.next(results);
        });
    });
  }


  downloadSub(subs, episode_path): Observable < any > {
    return Observable.create(observer => {
      const download_url = 'https://subscene.com' + subs['link'];
      return this.http.get < any[] > (download_url, {
          responseType: 'text' as 'json'
        })
        .subscribe(_response => {
          const _$ = cheerio.load(_response);
          const link = 'https://subscene.com' + _$('.download')['0'].children[1]['attribs'].href;

          return this.http.get(link, { responseType: 'arraybuffer' })
            .subscribe(__response => {
              let _path = this.path.dirname(episode_path);
              // let _path = this.path.join(episode_path);
              console.log('_path', _path);
              const that = this;
              this.fsExtra.readdir(_path, function(err, files) {
                if (files && files.length > 0) {
                  _path = that.path.join(_path, files[0]);
                }
              });

              this.fsExtra.appendFileSync(this.path.join(_path, subs['sub'] + '(' + subs['i'] + ')') + '.zip',
                new Buffer(__response), err => {
                if (err) {
                  console.log('Error creating zip file', err);
                }
              });

              const zip_path = this.path.join(_path, subs['sub'] + '(' + subs['i'] + ')') + '.zip';
              const unzipper = new this.zip(zip_path);

              unzipper.on('extract', function(log) {
                console.log('Finished extracting', log);
                // const srtPath = zip_path.substr(0,  zip_path.length - 7) + '.srt';
                const srtPath = that.path.join(that.path.dirname(episode_path), log[0]['deflated']);
                observer.next(srtPath);
                that.fsExtra.remove(zip_path, err => {
                  if (err) { console.log('Deleting zip:', zip_path, err); }
                });
              });

              unzipper.on('error', function(err) {
                console.log('Caught an error', err);
              });

              unzipper.extract({
                path: _path
              });

            });
        });
    });
  }


  private compare(a, b) {
    if (a.similarity < b.similarity) {
      return -1;
    }
    if (a.similarity > b.similarity) {
      return 1;
    }
    return 0;
  }

  private similarity(s1, s2) {
    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    const longerLength = longer.length;
    if (longerLength === 0) {
      return 1.0;
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
  }

  private editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        }
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) {
        costs[s2.length] = lastValue;
      }
    }
    return costs[s2.length];
  }


}