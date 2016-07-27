var browserSync = require('browser-sync');
var gulp = require('gulp');
var gulpLoadPlugins = require('gulp-load-plugins');
var pngquant = require('imagemin-pngquant');
var del = require('del');
var runSequence = require('run-sequence');
var pkg = require('./package.json');
var $ = gulpLoadPlugins();
var reload = browserSync.reload;

var   banner = [
    '/*!',
    ' * lvGulpApp v<%= pkg.version %>',
    ' * Author： <%= pkg.author %>.',
    ' * Time： <%= new Date().getFullYear() %>/<%= new Date().getMonth() %>/<%= new Date().getDate() %>.',
    ' */',
    ''].join('\n');
/*
 编译.scss文件,压缩css文件
 newer:只处理修改后的文件
 sourcemaps:生成Source map
 plumber:编译出现异常不退出监听
 sass:
 if:
 size:
 notify:捕获错误，返回错误信息


 sass:* nested：嵌套缩进的css代码，它是默认值。
 　　* expanded：没有缩进的、扩展的css代码。
 　　* compact：简洁格式的css代码。
 　　* compressed：压缩后的css代码。
 */



gulp.task('styles', function () {
    var AUTOPREFIXER_BROWSERS = ['ie >= 10',
        'ie_mob >= 10',
        'ff >= 30',
        'chrome >= 34',
        'safari >= 7',
        'opera >= 23',
        'ios >= 7',
        'android >= 4.4',
        'bb >= 10'
    ];
    return gulp.src([
        'src/styles/**/*.scss',
        'src/styles/**/*.css'
    ])
        .pipe($.newer('.tmp/styles'))
        .pipe($.sourcemaps.init())
        .pipe($.plumber({
                errorHandler: function (err) {
                    $.notify.onError({
                        title: "Gulp SASS Error",
                        message: "Error:<%= error.message %>",
                        sound: "Bottle"
                    })(err);
                }
            })
        )
        .pipe($.sass({
                // outputStyle: 'compressed'
                outputStyle: 'nested'
            }
        ).on('error', $.sass.logError))
        // .pipe($.plumber.stop())
        .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe($.header(banner, { pkg : pkg } ))
        .pipe(gulp.dest('.tmp/styles/'))
        .pipe($.base64({
            baseDir: 'src/images',
            extensions: ['svg', 'png', /\.jpg#datauri$/i],
            exclude: [/\.server\.(com|net)\/dynamic\//, '--live.jpg'],
            maxImageSize: 20 * 1024, // bytes
            debug: true
        }))


        .pipe($.rename({suffix: '.min'}))
        .pipe($.if('*.css', $.cssnano()))
        .pipe($.size({title: "styles"}))
        .pipe($.sourcemaps.write('./'))

        .pipe(gulp.dest('./dist/styles/'))
        .pipe(reload({stream: true}));//注入到浏览器里实现更新
})
/*

 */

gulp.task('html', function () {
    return gulp.src('src/**/*.html')
        .pipe($.useref({
            searchPath: '{.tmp,app}',
            noAssets: true
        }))
        .pipe($.if('*.html', $.htmlmin({
            removeComments: true,//清除HTML注释
            collapseWhitespace: true,//压缩HTML
            collapseBooleanAttributes: true,//省略布尔属性的值 <input checked="true"/> ==> <input />
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            removeEmptyAttributes: true,  //删除所有空格作属性值 <input id="" /> ==> <input />
            removeScriptTypeAttributes: true,//删除<script>的type="text/javascript"
            removeStyleLinkTypeAttributes: true,//删除<style>和<link>的type="text/css"
            removeOptionalTags: true,
            minifyJS: true,//压缩页面JS
            minifyCSS: true//压缩页面CSS
        })))
        .pipe($.if('*.html', $.size({title: 'html', showFiles: true})))
        // .pipe($.rev-append())
        .pipe(gulp.dest('dist'));
})
/*
 js 编码规范检查
 */

gulp.task('lint', function () {
    return gulp.src('src/js/**/*.js')
        .pipe($.eslint())
        .pipe($.plumber({
            errorHandler: function (err) {
                $.notify.onError({
                    title: "Gulp eslint Error",
                    message: "Error:<%= error.message %>",
                    sound: "Bottle"
                })(err);
            }
        }))
        .pipe($.eslint.format())
        .pipe($.if(!browserSync.active, $.eslint.failOnError()))
})
/*
 images
 */

gulp.task('images', function () {
    return gulp.src(['src/images/**/*.{png,jpg,gif,svg}', 'src/img/**/*.{png,jpg,gif,svg}'])
        .pipe($.cache(
            $.imagemin({
                optimizationLevel: 5, //类型：Number  默认：3  取值范围：0-7（优化等级）
                progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
                interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
                multipass: true, //类型：Boolean 默认：false 多次优化svg直到完全优化
                svgoPlugins: [{removeViewBox: false}],//不要移除svg的viewbox属性
                use: [pngquant()]
            })
        ))
        .pipe($.plumber({
            errorHandler: function (err) {
                $.notify.onError({
                    title: "Gulp Images Error",
                    message: "Error:<%= error.message %>",
                    sound: "Bottle"
                })(err);
            }
        }))
        .pipe(gulp.dest('dist/images'))
        .pipe($.size({title: 'images'}));
})

//concat 合并js; uglify 压缩;
gulp.task('appmainjs', function () {
    return gulp.src(["js/app/*/*.js"])
        .pipe($.newer('.tmp/js'))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('.tmp/js'))
        .pipe($.header(banner, { pkg : pkg } ))
        .pipe($.concat('main.min.js'))
        .pipe($.uglify())
        .pipe(gulp.dest('js/'))
})
/*
 uglify:
 参考网站:
 1.https://tonicdev.com/npm/gulp-uglify
 2.https://github.com/mishoo/UglifyJS2#the-simple-way
 a.mangle:是否修改变量名
 ✽ :except===》排除混淆关键字,//类型：Boolean 默认：true
 ex: mangle: {except: ['require' ,'exports' ,'module' ,'$']},
 ✽ :toplevel===》压缩界别
 */
gulp.task('scripts', function () {
    return gulp.src(
        ['src/js/**/*.js', '!src/libs/**/*.js'])
        .pipe($.newer('.tmp/js'))
        .pipe($.sourcemaps.init())
        // .pipe($.babel())
        .pipe(gulp.dest('.tmp/js'))
        .pipe($.concat('main.min.js'))
        .pipe($.uglify({
            mangle: {except: ['require', 'exports', 'module', '$'], toplevel: true},
            compress: true,//类型：Boolean 默认：true 是否完全压缩
            preserveComments: 'all' //all:保留所有注释 , some,license
        }))//是否保留解释
        .pipe($.size({title: 'scripts'}))
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('dist/js'))

})
gulp.task('default',  function (cb) {
    runSequence(
        'styles',
        ['lint', 'html', 'scripts', 'images','copy'],
        // 'generate-service-worker',
        cb
    )
})
gulp.task('serve', ['styles', 'scripts'], function () {
    browserSync({
        notify: false,
        logPrefix: 'BROWER',
        scrollElementMapping: ['.page', '.curent'],
        server: ['src', '.tmp'],
        port: 3000
    });
    gulp.watch("src/styles/*.{scss,css}", ['styles', reload]);
    gulp.watch(['src/js/**/*.js'], ['lint', 'scripts', reload]);
    gulp.watch(['src/images/**/*'], reload);
    gulp.watch("src/*.html").on('change', reload);

})
gulp.task('serve:dist', ['default'], function () {
    browserSync({
        notify: false,
        logPrefix: 'BROWER',
        scrollElementMapping: ['.page', '.curent'],
        server: ['dist'],
        port: 3001
    });
    gulp.watch("src/styles/*.{scss,css}", ['styles', reload]);
    gulp.watch(['src/js/**/*.js'], ['lint', 'scripts', reload]);
    gulp.watch(['src/images/**/*'], reload);
    gulp.watch("src/*.html").on('change', reload);

})

gulp.task('clean', function () {
    del(['.tmp', 'dist/*', '!dist/.git'], {dot: true});
})
// Copy all files at the root level (app)
gulp.task('copy', function () {
        gulp.src([
            'src/*',
            '!src/*.html',
            'node_modules/apache-server-configs/dist/.htaccess'
        ], {
            dot: true
        }).pipe(gulp.dest('dist'))
            .pipe($.size({title: 'copy'}))
    }
);

/*
 合并flash js
 .pipe($.concat('main.min.js'))
 */
gulp.task('flashjs', function () {
    gulp.src(['flash/*.js'])
        .pipe(gulp.dest('.tmp/js'))
        .pipe($.concat('mc.min.js'))
        .pipe($.size({title: 'flashjs'}))
})


gulp.task('flashimg', function () {
    return gulp.src(['flash/**/*.{png,jpg,gif,svg}'])
        .pipe($.cache(
            $.imagemin({
                optimizationLevel: 5, //类型：Number  默认：3  取值范围：0-7（优化等级）
                progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
                interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
                multipass: true, //类型：Boolean 默认：false 多次优化svg直到完全优化
                svgoPlugins: [{removeViewBox: false}],//不要移除svg的viewbox属性
                use: [pngquant()]
            })
        ))
        .pipe($.plumber({
            errorHandler: function (err) {
                $.notify.onError({
                    title: "Gulp Images Error",
                    message: "Error:<%= error.message %>",
                    sound: "Bottle"
                })(err);
            }
        }))
        .pipe(gulp.dest('dist/images'))
        .pipe($.size({title: 'flashimg'}));
})

gulp.task('help', function () {
    console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
    console.log("1. gulp clean :清除目录");
    console.log("2. gulp serve :启动服务器,并监测编译刷新浏览器");
    console.log("3. gulp scripts :合并压缩js");
    console.log("4. gulp styles :合并压缩scss文件为css");
    console.log("5. gulp lint :js编码规范");
    console.log("6. gulp html :压缩html,并且合并html文件");
})

