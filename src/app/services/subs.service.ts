import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ElectronService} from 'ngx-electron';
import {HttpClient} from '@angular/common/http';
import * as cheerio from 'cheerio';

@Injectable()
export class SubsService {

  private fsExtra = this.electronService.remote.getGlobal('fsExtra');
  private zip = this.electronService.remote.getGlobal('zip');
  private path = this.electronService.remote.getGlobal('path');

  constructor(
    private electronService: ElectronService,
    private http: HttpClient
  ) {
  }

  convertNumberToOrdinal(n) {
    switch (n) {
      case 1:
        return 'first';
      case 2:
        return 'second';
      case 3:
        return 'third';
      case 4:
        return 'fourth';
      case 5:
        return 'fifth';
      case 6:
        return 'sixth';
      case 7:
        return 'seventh';
      case 8:
        return 'eighth';
      case 9:
        return 'ninth';
      case 10:
        return 'tenth';
      case 11:
        return 'eleventh';
      case 12:
        return 'twelfth';
      case 13:
        return 'thirteenth';
      case 14:
        return 'fourteenth';
      case 15:
        return 'fifteenth';
      case 16:
        return 'sixteenth';
      case 17:
        return 'seventeenth';
      case 18:
        return 'eighteenth';
      case 19:
        return 'nineteenth';
      case 20:
        return 'twentieth';
      case 21:
        return 'twenty-first';
      case 22:
        return 'twenty-second';
      case 23:
        return 'twenty-third';
      case 24:
        return 'twenty-fourth';
      case 25:
        return 'twenty-fifth';
      case 26:
        return 'twenty-sixth';
      case 27:
        return 'twenty-seventh';
      case 28:
        return 'twenty-eighth';
      case 29:
        return 'twenty-ninth';
      case 30:
        return 'thirtieth';
      case 31:
        return 'thirty-first';
    }
  }

  // retrieveSubs(show, epLabel, dn): Observable<any> {
  //   return new Observable(observer => {
  //     // dn = dn.replace(/'/g, ' ');
  //     const url = 'https://www.subtitlecat.com/index.php?search=' + show['title'] + ' ' + epLabel;
  //     console.log('retrieveSubs', url, dn);
  //     return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
  //       .subscribe(response => {
  //         const $ = cheerio.load(response, { _useHtmlParser2: true });
  //         const results = [];
  //         $('tr').filter((i, row) => {
  //           if (i > 0) {
  //             const fileName = row.children[1].children[0].children[0].data;
  //             if (this.similarity(fileName, dn) > .2) {
  //               let href = row.children[1].children[0].attribs.href;
  //               href = href.substr(0, href.length - 5) + '-en.srt';
  //               const split = href.split('/');
  //               split[1] = parseInt(href.split('/')[1], 10) + 1;
  //               const alternateHref = split.join('/');
  //               results.push({
  //                 href: 'https://www.subtitlecat.com/' + href,
  //                 name: fileName
  //               });
  //               results.push({
  //                 href: 'https://www.subtitlecat.com/' + alternateHref,
  //                 name: fileName
  //               });
  //             }
  //           }
  //         });
  //         let validSubs = 0;;
  //         results.forEach(r => {
  //           this.http.get(r.href, { responseType: 'text' })
  //           .subscribe(res => {
  //             console.log('Response found for', r.href);
  //             validSubs++;
  //             if (validSubs < 6) {
  //               observer.next({
  //                 sub: r.name,
  //                 link: r.href
  //               });
  //             }
  //           }, err => {
  //             // console.log('err', err);
  //           });
  //         });
  //       });
  //   });
  // }
  //
  // downloadSub(subs, episodePath): Observable<any> {
  //   return Observable.create(observer => {
  //         return this.http.get(subs['link'], { responseType: 'arraybuffer' })
  //           .subscribe(detailsPage => {
  //             let subsPath = this.path.dirname(episodePath);
  //             console.log('subsPath --->', subs, subsPath);
  //             const that = this;
  //             this.fsExtra.readdir(subsPath, (err, files) => {
  //               if (files && files.length > 0) {
  //                 subsPath = that.path.join(subsPath, files[0]);
  //               }
  //             });
  //
  //             this.fsExtra.appendFileSync(this.path.join(subsPath, subs['sub']) + '.srt',
  //               Buffer.from(detailsPage), err => {
  //                 if (err) {
  //                   console.log('Error creating srt file', err);
  //                 }
  //               });
  //
  //             const Path = this.path.join(subsPath, subs['sub']) + '.srt';
  //             // const unzipper = new this.zip(Path);
  //
  //             observer.next(Path);
  //
  //       });
  //   });
  // }

  retrieveSubs(show, epLabel, dn): Observable<Array<any>> {
    return new Observable(observer => {
      // dn = dn.replace(/'/g, ' ');
      const season = parseInt(epLabel.substring(1, 3), 10);
      const dashedTitle = show['title'].replace(/'/g, '').replace(/ /g, '-');
      const url = 'https://subscene.com/subtitles/' + dashedTitle + '-' + this.convertNumberToOrdinal(season) + '-season';
      console.log(url);
      return this.http.get<any[]>(url, {responseType: 'text' as 'json'})
        .subscribe(response => {
          const $ = cheerio.load(response, {_useHtmlParser2: true});
          const searchResults = [];
          const results = [];
          $('.a1').filter((i, row) => {
            if (row.children[1] && row.children[1].children[1].children[0].data.trim() === 'English' && searchResults.length < 6) {
              const subLang = row.children[1].children[1].children[0].data.trim();
              const subLink = row.children[1].attribs.href;
              const subDn = row.children[1].children[3].children[0].data.trim();
              results.push({
                lang: subLang,
                dn: subDn
              });
              searchResults.push(this.http.get<any[]>('https://subscene.com' + subLink,
                {responseType: 'text' as 'json'}));
            }
          });

          searchResults.map((sub, i) => {
            sub.subscribe(subResponse => {
              const _$ = cheerio.load(subResponse, {_useHtmlParser2: true});
              // console.log(i, _$('.download')[0].children[1].attribs.href);
              results[i].link = _$('.download')[0].children[1].attribs.href;
              observer.next(results[i]);
            });
          });


        });
    });
  }

  downloadSub(subs, episodePath): Observable<any> {
    return new Observable(observer => {
      // console.log('subs', subs, 'episodePath', episodePath);
      const downloadUrl = 'https://subscene.com' + subs['link'];
      return this.http.get(downloadUrl, {responseType: 'arraybuffer'})
        .subscribe(detailsPage => {
          let subsPath = this.path.dirname(episodePath);
          // console.log('subsPath', subsPath);
          const that = this;
          this.fsExtra.readdir(subsPath, (err, files) => {
            if (files && files.length > 0) {
              subsPath = that.path.join(subsPath, files[0]);
            }
          });

          this.fsExtra.appendFileSync(this.path.join(subsPath, subs['sub'] + '(' + subs['i'] + ')') + '.zip',
            Buffer.from(detailsPage));

          const zipPath = this.path.join(subsPath, subs['sub'] + '(' + subs['i'] + ')') + '.zip';
          const unzipper = new this.zip(zipPath);

          unzipper.on('extract', log => {
            // console.log('Finished extracting', log);
            // const srtPath = zipPath.substr(0,  zipPath.length - 7) + '.srt';
            const srtPath = that.path.join(that.path.dirname(episodePath), log[0]['deflated']);
            observer.next(srtPath);
            that.fsExtra.remove(zipPath, err => {
              if (err) {
                console.log('Deleting zip:', zipPath, err);
              }
            });
          });

          unzipper.on('error', (err) => {
            console.log('Caught an error', err);
          });

          unzipper.extract({
            path: subsPath
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
        } else {
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
