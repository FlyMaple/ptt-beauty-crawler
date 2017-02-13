/** LIB */
var fs = require('fs');
var url = require("url");
var request = require('request');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');

var post_list = [];

function download(uri, folderName, filename, callback){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    // console.log( '圖片下載中: ' + uri );
    request(uri).pipe(fs.createWriteStream('./' + folderName + '/' + filename)).on('close', callback);
  });
};

function _formatSrc(src) {
    if (src.indexOf('http') === -1) {
        return 'http:' + src;
    }

    return src;
}

function _formatLink(url) {
    if (url.indexOf('http') === -1) {
        return 'https://www.ptt.cc' + url;
    }

    return url;
}

function formatFolderName(name) {
    return name.replace(/\//gi, ' ').replace(/\\/gi, ' ').replace(/:/gi, '：').replace(/\*/gi, '＊').replace(/\?/gi, '？').replace(/\"/gi, '\'\'').replace(/</gi, '＜').replace(/>/gi, '＞').replace(/\|/gi, ' ');
}

function createFolder(folderName, cb) {
    // console.log( '建立資料夾...' );
    fs.mkdir('./' + folderName, 0777, cb);
}

function parseImgAndDownload(link, folderName, cb) {
    // console.log( '圖片備份中...' );
    var cheerioOptions = {
        normalizeWhitespace: true
    };


    request(link, function (err, res, body) {
        
        var $ = cheerio.load(body, cheerioOptions);
        var $mainContent = $('#main-container');
        var $richContentImgs = $('.richcontent img', $mainContent);

        $richContentImgs.each(function (index, richContentImg) {
            var imgSrc = _formatSrc($(richContentImg).attr('src'));

            download(imgSrc, folderName, index + '.jpg', function(){
                
            });
        });
    });
}

function parseBaseInfos(link) {
    var cheerioOptions = {
        normalizeWhitespace: true
    };

    request(link, function (err, res, body) {
        var $ = cheerio.load(body, cheerioOptions);
        var $mainContent = $('#main-container');
        var $author = $('.article-metaline:nth-child(1) .article-meta-value', $mainContent);
        var $title = $('.article-metaline:nth-child(3) .article-meta-value', $mainContent);
        var $time = $('.article-metaline:nth-child(4) .article-meta-value', $mainContent);
        var $richContentImgs = $('.richcontent img', $mainContent);

        var author = $author.text().split('(')[0].trim();
        var title = $title.text().trim();
        var time = $time.text();

        var d = new Date(time);
        var year = d.getFullYear();
        var month = d.getMonth() + 1;
        var date = d.getDate();
        var folderName = '[' + year + '-' + month + '-' + date + '] ' + title + ' - 作者： ' + author;

        folderName = formatFolderName(folderName);

        createFolder(folderName, function () {
            fs.writeFile('./' + folderName + '/index.html', body);
            $richContentImgs.each(function (index, richContentImg) {
                var imgSrc = _formatSrc($(richContentImg).attr('src'));

                download(imgSrc, folderName, index + '.jpg', function(){
                    
                });
            });
        });
    });
}

function generate(link) {
    parseBaseInfos(link);
}

function init() {
    setInterval(run, 3 * 1000);
}

function run() {
    var cheerioOptions = {
        normalizeWhitespace: true
    };

    request('https://www.ptt.cc/bbs/Beauty/index.html', function (err, res, body) {
        try {
            var $ = cheerio.load(body, cheerioOptions);
            var $items = $('.r-list-container .r-ent');
            
            $items.each(function (index, item) {
                var $title = $('.title', item);
                var $link = $('.title a', item);
                var $date = $('.meta .date', item);
                var $author = $('.meta .author', item);

                if ($link !== undefined) {
                    var title = $title.text().trim();
                    var link = $link.attr('href');
                    var date = $date.text().trim().replace(/\//, '-');
                    var author = $author.text().trim();

                    if (link !== undefined) {
                        if (title.indexOf('[公告]') === -1) {
                                var UrlInfo = url.parse(link);
                                if (post_list.indexOf(UrlInfo.pathname) === -1) {
                                    post_list.push(UrlInfo.pathname);

                                    console.log( '==== 獲取資訊 ====' );
                                    console.log( '標　　題: ' + title );
                                    console.log( '日　　期: ' + date );
                                    console.log( '作　　者: ' + author );
                                    console.log( '連　　結: ' + _formatLink(link) );
                                    console.log( '--------------------------------------------------------' );
                                    generate(_formatLink(link));
                                }
                        }
                    }
                }
            });

            if (post_list.length > 30) {
                post_list.splice(0, 10)
            }
        } catch (e) {

        }
    });
}

/** MAIN */
var ep = new eventproxy();

init();