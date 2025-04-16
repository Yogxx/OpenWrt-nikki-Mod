'use strict';
'require form';
'require view';
'require uci';
'require poll';
'require tools.nikki as nikki';

function renderStatus(running) {
    return updateStatus(E('input', { id: 'core_status', style: 'border: unset; font-style: italic; font-weight: bold;', readonly: '' }), running);
}

function updateStatus(element, running) {
    if (element) {
        element.style.color = running ? 'green' : 'red';
        element.value = running ? _('Running') : _('Not Running');
    }
    return element;
}
/**#1#*/
function fetchAndUpdateIP() {
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
            document.getElementById('ip_status').textContent = data.ip || 'N/A';
            document.getElementById('region_status').textContent = data.region || 'N/A';
            document.getElementById('country_status').textContent = data.country_name || 'N/A';
        })
        .catch(() => {
            document.getElementById('ip_status').textContent = 'Failed to load IP';
            document.getElementById('region_status').textContent = 'Failed to load Region';
            document.getElementById('country_status').textContent = 'Failed to load Country';
        });
}
/**#1#*/
return view.extend({
    load: function () {
        return Promise.all([
            uci.load('nikki'),
            nikki.version(),
            nikki.status(),
            nikki.listProfiles()
        ]);
    },
    render: function (data) {
        const subscriptions = uci.sections('nikki', 'subscription');
        const appVersion = data[1].app ?? '';
        const coreVersion = data[1].core ?? '';
        const running = data[2];
        const profiles = data[3];

        let m, s, o;
/**#2#*/
        let animatedText = `
            <div id="animated-text">
                𝙽𝙸𝙺𝙺𝙸-𝙽𝙸𝙺𝙺𝙸
            </div>
        `;
/**#2#*/
        m = new form.Map('nikki', _(animatedText), `${_('Transparent Proxy with Mihomo on OpenWrt.')} <a href="https://github.com/nikkinikki-org/OpenWrt-nikki/wiki" target="_blank">${_('How To Use')}</a>`);
/**#3#*/        
        let style = document.createElement('style');
            /**style.id = 'nikki-style';*/
            style.innerHTML = `
                @keyframes colorAnimation {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }

                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                #animated-text {
                    display: inline-block;
                    white-space: nowrap;
                    font-size: 30px;
                    font-weight: bold;
                    background: linear-gradient(90deg, #ff0000, #ff7300, #ffdd00, #48ff00, #00eaff, #0048ff, #9b00ff, #ff0000);
                    background-size: 400% 400%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    text-align: center;
                    width: 100%;
                    animation: colorAnimation 3s infinite linear, bounce 1.5s infinite ease-in-out;
                }
            `;
            document.head.appendChild(style);
/**#3#*/        
        s = m.section(form.TableSection, 'status', _('<p><strong>❖ 𝔖𝔱𝔞𝔱𝔲𝔰</strong></p>'));
        s.anonymous = true;
/**#4#*/        
        o = s.option(form.DummyValue, '_ip_status', _('IP Address'));
        o.cfgvalue = () => E('div', { id: 'ip_status', style: 'font-weight: bold; color: red;' }, 'Loading IP...');

        o = s.option(form.DummyValue, '_region_status', _('Region'));
        o.cfgvalue = () => E('div', { id: 'region_status', style: 'font-weight: bold; color: yellow;' }, 'Loading Region...');

        o = s.option(form.DummyValue, '_country_status', _('Country'));
        o.cfgvalue = () => E('div', { id: 'country_status', style: 'font-weight: bold; color: lime;' }, 'Loading Country...');

        setTimeout(fetchAndUpdateIP, 500);
/**#4#*/        
        o = s.option(form.Value, '_app_version', _('App Version'));
        o.readonly = true;
        o.load = function () {
            return appVersion;
        };
        o.write = function () { };

        o = s.option(form.Value, '_core_version', _('Core Version'));
        o.readonly = true;
        o.load = function () {
            return coreVersion;
        };
        o.write = function () { };

        o = s.option(form.DummyValue, '_core_status', _('Core Status'));
        o.cfgvalue = function () {
            return renderStatus(running);
        };
        poll.add(function () {
            return L.resolveDefault(nikki.status()).then(function (running) {
                updateStatus(document.getElementById('core_status'), running);
            });
        });

        o = s.option(form.Button, 'reload');
        o.inputstyle = 'action';
        o.inputtitle = _('Reload Service');
        o.onclick = function () {
            return nikki.reload();
        };

        o = s.option(form.Button, 'restart');
        o.inputstyle = 'negative';
        o.inputtitle = _('Restart Service');
        o.onclick = function () {
            return nikki.restart();
        };

        o = s.option(form.Button, 'update_dashboard');
        o.inputstyle = 'positive';
        o.inputtitle = _('Update Dashboard');
        o.onclick = function () {
            return nikki.updateDashboard();
        };

        o = s.option(form.Button, 'open_dashboard');
        o.inputtitle = _('Open Dashboard');
        o.onclick = function () {
            return nikki.openDashboard();
        };

        s = m.section(form.NamedSection, 'config', 'config', _('<p><strong>❖ 𝔄𝔭𝔭 ℭ𝔬𝔫𝔣𝔦𝔤</strong></p>'));

        o = s.option(form.Flag, 'enabled', _('Enable'));
        o.rmempty = false;

        o = s.option(form.ListValue, 'profile', _('Choose Profile'));
        o.optional = true;

        for (const profile of profiles) {
            o.value('file:' + profile.name, _('File:') + profile.name);
        };

        for (const subscription of subscriptions) {
            o.value('subscription:' + subscription['.name'], _('Subscription:') + subscription.name);
        };

        o = s.option(form.Value, 'start_delay', _('Start Delay'));
        o.datatype = 'uinteger';
        o.placeholder = '0';

        o = s.option(form.Flag, 'scheduled_restart', _('Scheduled Restart'));
        o.rmempty = false;

        o = s.option(form.Value, 'cron_expression', _('Cron Expression'));
        o.retain = true;
        o.rmempty = false;
        o.depends('scheduled_restart', '1');

        o = s.option(form.Flag, 'test_profile', _('Test Profile'));
        o.rmempty = false;

        o = s.option(form.Flag, 'fast_reload', _('Fast Reload'));
        o.rmempty = false;

        s = m.section(form.NamedSection, 'config', 'config', _('<p><strong>❖ ℭ𝔬𝔯𝔢 ℭ𝔬𝔫𝔣𝔦𝔤</strong></p>'));

        o = s.option(form.Flag, 'disable_safe_path_check', _('Disable Safe Path Check'));
        o.ucisection = 'env';
        o.rmempty = false;

        o = s.option(form.Flag, 'disable_loopback_detector', _('Disable Loopback Detector'));
        o.ucisection = 'env';
        o.rmempty = false;

        o = s.option(form.Flag, 'disable_quic_go_gso', _('Disable GSO of quic-go'));
        o.ucisection = 'env';
        o.rmempty = false;

        o = s.option(form.Flag, 'disable_quic_go_ecn', _('Disable ECN of quic-go'));
        o.ucisection = 'env';
        o.rmempty = false;

        return m.render();
    }
});
