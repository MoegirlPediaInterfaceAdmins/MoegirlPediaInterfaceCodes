/* eslint-disable */
// <pre>
$(function () {
    var rollbackLinks = $('span.mw-rollback-link');
    function wgULS(hans, hant) {
        var ret = {
            'zh': hans || hant,
            'zh-hans': hans,
            'zh-hant': hant,
            'zh-cn': hans,
            'zh-sg': hans,
            'zh-tw': hant,
            'zh-hk': hant,
            'zh-mo': hant
        }
        return ret[mw.config.get('wgUserLanguage')] || hans || hant;
    }
    if (!rollbackLinks[0] || document.title.indexOf(wgULS("用户贡献", "用戶貢獻")) == -1) return;
    $(mw.util.addPortletLink('p-views', 'javascript:void(0)', '批量回退', 'ca-rollbackEverything', wgULS('回退本頁的所有編輯'))).on('click', async function () {
        if (!await oouiDialog.confirm('你确定真的要回退此用户的所有编辑？')) return;
        $('body').css('overflow', 'hidden').append($('<div/>', {
            css: {
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                'background-color': 'rgba(0,0,0,0.73)',
                'z-index': 101
            }
        })
            .append($('<div>', {
                css: {
                    width: '10em',
                    padding: '2em',
                    border: '#a7d7f9 3px solid',
                    'border-radius': '3px',
                    'text-align': 'center ',
                    'background-color': 'white',
                    'margin': $(window).height() / 4 + 'px auto 0'
                },
                text: '正在批量回退……'
            })
                .append('<div><span id="rbt">0</span>/' + rollbackLinks.length + '</div><div id="cancel" style="width:2em;padding:0.5em 1em;color:white;background:rgba(255,0,0,0.73);box-shadow: 3px 3px 3px -2px black;margin: auto;cursor: pointer;">取消</div>')));
        var rbt = $('#rbt'),
            length = rollbackLinks.length,
            flag = true;
        $('#cancel').on('click', function () {
            $(this).css('background', '#aaa')
            flag = false;
        });
        rollbackLinks.each(function () {
            var obj = {};
            if (mw.config.get('wgRollbackTool') == 'inited') obj = $(this).find('a').data();
            else {
                $(this).attr('href').slice(11).split('&').forEach(function (v) {
                    var arr = v.split('=');
                    obj[arr[0]] = decodeURIComponent(arr[1]);
                });
            }
            $.ajax({
                url: mw.config.get("wgServer") + mw.config.get("wgScriptPath") + '/api.php',
                type: 'POST',
                data: {
                    title: obj.title,
                    user: obj.from,
                    summary: '批量回退',
                    token: obj.token,
                    action: 'rollback',
                    format: 'json'
                },
                beforeSend: function () {
                    return flag;
                },
                success: function (d) {
                    if (!d.error) rbt.text(+rbt.text() + 1);
                    if (!--length) window.location.reload();
                }
            });
        });
    });
});
// </pre>