import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ElectronService } from 'ngx-electron';
import { HttpClient } from '@angular/common/http';
import * as cheerio from 'cheerio';
import { ResponseContentType } from '@angular/http';

@Injectable()
export class SubsService {

  private local_path = this._electronService.remote.getGlobal('local_path');
  private fs = this._electronService.remote.getGlobal('fs');
  private zip = this._electronService.remote.getGlobal('zip');
  private path = this._electronService.remote.getGlobal('path');


  constructor(
    private _electronService: ElectronService,
    private http: HttpClient
  ) {
    // console.log('local_path', this.local_path);
  }


  downloadSub(dn, episode_path): Observable<any> {
    return Observable.create(observer => {
      dn = dn.replace(/'/g, ' ');
      const url = 'https://subscene.com/subtitles/release?q=' + dn;
      console.log(url);
      return this.http.get<any[]>(url, { responseType: 'text' as 'json' })
        .subscribe(response => {
          const $ = cheerio.load(response);
          let results = [];
          $('tr').map((i, element) => {
            if (i > 0) {
              const sub_name = element.children[1].children[1].children[3].children[0].data.trim(),
                link = element.children[1].children[1].attribs.href,
                lang = element.children[1].children[1].children[1].children[0].data.trim();

              // console.log('\n');
              // console.log('dn   =>', dn);
              // console.log('sub  =>', sub_name);
              // console.log(this.similarity(dn, sub_name));
              let similarity = this.similarity(dn, sub_name);
              if (lang === 'English' && similarity > 0.7) {
                results.push({
                  dn: dn,
                  sub: sub_name,
                  link: link,
                  lang: lang,
                  similarity: similarity
                })
              }
            }
          });
          let subs = results.sort(this.compare).slice(-1).pop();
          if (!subs) { return; }

          const download_url = 'https://subscene.com' + subs['link'];
          // console.log(download_url);

          return this.http.get<any[]>(download_url, { responseType: 'text' as 'json' })
            .subscribe(response => {
              const $ = cheerio.load(response);
              console.log($('.download'));
              console.log($('.download')['0'].children[1]['attribs'].href);
              const link = 'https://subscene.com' + $('.download')['0'].children[1]['attribs'].href;

              return this.http.get(link, { responseType: 'arraybuffer' })
                .subscribe(response => {
                  let _path = this.path.join('c:\\Users\\sam\\Downloads\\cereal\\', episode_path);

                  console.log('Subs path', _path);

                  let that = this;
                  this.fs.readdir(_path, function(err, files) {
                    console.log('Episode path', _path, files);
                    if (files && files.length > 0) {
                      _path = that.path.join(_path, files[0]);
                      console.log('Final path', _path);
                    }
                  });

                  this.fs.appendFileSync(_path + 'subs.zip', new Buffer(response), err => {
                    if (err) { console.log('Error creating zip file', err); }
                  });

                  var unzipper = new this.zip(this.path.join(_path + 'subs.zip'));

                  unzipper.on('extract', function(log) {
                    console.log('Finished extracting', log);
                  });

                  unzipper.on('error', function(err) {
                    console.log('Caught an error', err);
                  });

                  unzipper.extract({
                    path: _path
                  });

                })
            })




          // return Observable.of(subs);
        });
    });

  }


  private compare(a, b) {
    if (a.similarity < b.similarity)
      return -1;
    if (a.similarity > b.similarity)
      return 1;
    return 0;
  }

  private similarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength);
  }

  private editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }


}
