window.bootAd = function () {
}
window.game = {
    resize: function () {
    },
    volume: function () {
    },
    showPopup: function () {
    },
    resume: function () {
    },
    pause: function () {
    }
}

if (window.Playable) {
    window.Playable.config = null;
    window.Playable.ad_dynamic = null;
    window.Playable.translations = null;
}

/**
 * @author       Peter Hutsul <peter@greenpandagames.com>
 * @copyright    2021 GREEN PANDA GAMES
 * @license      {@link https://legal.ubi.com/privacypolicy/en-INTL}
 */

/**
 * The gp it is the main working object of Green Panda Playable template SDK.
 * You can access to global functions of it object
 *
 * Also you can listen to standard events from this object
 *
 * init - will call on very start of session
 *
 * ```javascript
 * gp.on('init', function () {});
 * gp.once('init', function () {}, context);
 * ```
 *
 * preboot - will before you playablw will be created
 *
 * ```javascript
 * gp.on('preboot', function () {});
 * ```
 *
 * render - will call after you playable will be rendered
 *
 * ```javascript
 * gp.on('render', function () {});
 * ```
 *
 * resize - will call after page will be resized
 *
 * ```javascript
 * gp.on('resize', function () {});
 * ```
 *
 */
window.gp = (function(globalContext)
{

    globalContext.GP_VERSION = "{PLAYABLE_HASH}";
    globalContext.GP_DATE = "{PLAYABLE_DATE}";
    globalContext.GPP_TITLE = "{GPP_TITLE}";
    globalContext.GPP_IOS_APP_STORE_URL = "{GPP_IOS_APP_STORE_URL}";
    globalContext.GPP_GOOGLE_PLAY_MARKET_URL = "{GPP_GOOGLE_PLAY_MARKET_URL}";
    globalContext.GPP_DESTINATION_URL = (/android/i.test(navigator.userAgent)) ? GPP_GOOGLE_PLAY_MARKET_URL : GPP_IOS_APP_STORE_URL;
    globalContext.GPP_NETWORK = "{GPP_NETWORK}";
    globalContext.ad_dynamic = "{AD_DYNAMIC_DEFAULT}";

    globalContext.working_exh = ["unity", "vungle", "facebook", "tapjoy", "adcolony", "google", "ironsource", "snapchat", "applovin", "appreciate", "toutiao", "mintegral"]


    var clicked_install_allready = false,
        is_playable_showed = false,
        _renderable = false,
        mraid_ready = false,
        input_handlers_registered = false,
        listeningToTouchEvents = false;

    var paused = false;
    var mraid_partners = ["unity", "applovin", "ironsource", "appreciate", "adcolony"];
    var _network_exchange = "";
    var _GGAME = {};

    function isMraid()
    {
        return (mraid_partners.indexOf(_network_exchange) > -1 && !globalContext.isDapi && !globalContext.isNucleo);
    }

    var size = {
        width: globalContext.innerWidth,
        height: globalContext.innerHeight
    };

    document.addEventListener('touchmove', function(e)
        {
            e.preventDefault();
            return false;
        },
        {
            passive: false
        });

    globalContext.onerror = function(t, e, i, n, s)
    {
        var r = t + ", url=" + e + ", line=" + i;
        n && (r += ", column=" + n), s && (r += ", error=" + JSON.stringify(s));
        analytics.logError(t, i, n);
        globalContext.TJ_API && globalContext.TJ_API.error(r)
    };

    function _showPlayable()
    {
        GP_API.emit("preboot");

        bootAd(size.width, size.height);

        GP_API.emit("boot");

        var hidden, visibilityChange;

        if (typeof document.hidden !== "undefined")
        {
            hidden = "hidden";
            visibilityChange = "visibilitychange";
        }
        else if (typeof document.webkitHidden !== "undefined")
        {
            hidden = "webkitHidden";
            visibilityChange = "webkitvisibilitychange";
        }

        document.addEventListener(visibilityChange, function(e)
        {
            if (document[hidden])
            {
                glog("visibility_changed", "hidden");
                _onPause()
            }
            else
            {
                glog("visibility_changed", "visible");
                _onResume()
            }
        });
    }



    function showPlayable()
    {
        if (!is_playable_showed)
        {
            is_playable_showed = true;

            document.body.oncontextmenu = function() {return false};

            GP_API.emit("ready");

            if (addyn.ready)
            {
                _showPlayable();
            }
            else
            {
                GP_API.once("addyn_ready", _showPlayable);
            }
        }
    }

    function getScale(width, height)
    {
        var mw = 0
        var mh = 0

        if (width > height)
        {
            mw = width * 640 / height;
            mh = height * 960 / width;
        }
        else
        {
            mw = width * 960 / height;
            mh = height * 640 / width;
        }

        return 1 / Math.max(mw / width, mh / height);
    }

    function _onResize(width, height)
    {
        size.width = width || Math.floor(globalContext.innerWidth);
        size.height = height || Math.floor(globalContext.innerHeight);

        var wdth = size.width
        var hght = size.height

        var glandscape = wdth > hght;

        if (GP_API.glandscape != undefined && glandscape != GP_API.glandscape)
        {
            glog("orientation_changed", glandscape ? "landscape" : "portrait");
        }

        GP_API.glandscape = glandscape;

        var gscale = getScale(wdth, hght);
        GP_API.gscale = gscale;

        GP_API.emit("gresize", wdth, hght, gscale);

        var w = wdth - Banner.width;
        var h = hght - Banner.height;

        GP_API.landscape = w > h;

        var scale = getScale(w, h);

        GP_API.scale = scale;

        if (_renderable)
        {
            _GGAME.isLandscape = w > h;

            if (_GGAME.resize)
            {
                _GGAME.resize(w, h, scale);
            }
        }

        GP_API.emit("resize", w, h, scale);
    }

    function changeVolume(value)
    {
        if (typeof _GGAME.volume == "function")
        {
            _GGAME.volume(value)
        }
    }

    function _onPause()
    {
        changeVolume(0)

        GP_API.emit("pause");

        if (typeof _GGAME.pause == "function")
        {
            _GGAME.pause()
        }
    }

    function _onResume()
    {
        if (paused) return;

        changeVolume(GP_API.vol)

        GP_API.emit("resume");

        if (typeof _GGAME.resume == "function")
        {
            _GGAME.resume()
        }
    }

    function fireResizeEvent(width, height)
    {
        globalContext.innerWidth = width;
        globalContext.innerHeight = height;
        var t = document.createEvent("HTMLEvents");
        t.initEvent("resize", true, false);
        globalContext.dispatchEvent(t);
    }

    function _dapiIsViewable(event)
    {
        glog("dapi_viewable", event);

        if (event.isViewable)
        {
            if (is_playable_showed)
            {
                _onResume();
            }
            else
            {
                var screenSize = dapi.getScreenSize();
                globalContext.innerWidth = size.width = Math.floor(screenSize.width);
                globalContext.innerHeight = size.height = Math.floor(screenSize.height);
                showPlayable();
            }
        }
        else
        {
            _onPause();
        }
    }

    function _mraidIsViewable(viewable)
    {
        glog("mraid_viewable", viewable);

        if (viewable)
        {
            if (_network_exchange == "ironsource")
            {
                var screenSize = mraid.getMaxSize();
                globalContext.innerWidth = size.width = Math.floor(screenSize.width);
                globalContext.innerHeight = size.height = Math.floor(screenSize.height);
            }

            if (is_playable_showed)
            {
                _onResume();
            }
            else
            {
                showPlayable();
            }
        }
        else
        {
            _onPause();
        }
    }

    function checkViewable()
    {
        if (!mraid_ready)
        {
            mraid.removeEventListener("ready", checkViewable);

            glog("mraid_ready");

            mraid.addEventListener("viewableChange", function(e)
            {

                console.log("Viewable changed to: " + e + " (" + typeof e + ")");
                var isViewable = mraid.isViewable();

                _mraidIsViewable(isViewable);
            })

            if (mraid.isViewable() || _network_exchange == "adcolony")
            {
                _mraidIsViewable(true);
            }

            mraid.addEventListener("audioVolumeChange", function(t)
            {
                null !== t && (t > 0 ? changeVolume(GP_API.vol) : changeVolume(0))
            });

            if ("adcolony" == _network_exchange && "function" == typeof mraid.preloadStore)
            {
                var e = globalContext.adcolony_sdk_settings_object ? globalContext.adcolony_sdk_settings_object.install_url : GPP_DESTINATION_URL;
                mraid.preloadStore(e)
            }


            mraid.addEventListener("error", function(t, e)
            {

                console.log("mraid error: " + t + "   action: " + e);

                analytics.logError(t + ": " + e);

            });

            if (_network_exchange == "ironsource")
            {
                mraid.addEventListener("sizeChange", function()
                {
                    var ms = mraid.getMaxSize();
                    fireResizeEvent(ms.width, ms.height);
                });
            }

            mraid.addEventListener("stateChange", function(t)
            {
                if ("expanded" === t && "adex" !== _network_exchange)
                {
                    return false;
                }

                switch (t)
                {
                    case "hidden":
                        break;
                    case "expanded":
                        "adex" === _network_exchange && showPlayable();
                        break;
                    case "default":
                        console.log("Toggle to: Default")
                }

            });

            mraid_ready = true;
        }
    }

    function onDapiReadyCallback()
    {

        dapi.removeEventListener("ready", onDapiReadyCallback);

        glog("dapi_ready");

        var isAudioEnabled = !!dapi.getAudioVolume();

        dapi.addEventListener("audioVolumeChange", function(volume)
        {
            var isAudioEnabled = !!volume;

            if (isAudioEnabled)
            {
                changeVolume(GP_API.vol);
            }
            else
            {
                changeVolume(0);
            }
        });

        dapi.addEventListener("adResized", function()
        {
            var ms = dapi.getScreenSize();
            fireResizeEvent(ms.width, ms.height);
        });

        if (dapi.isViewable())
        {
            _dapiIsViewable({isViewable: true})
        }

        dapi.addEventListener("viewableChange", _dapiIsViewable);
    }

    function _initNucleoCallbacks()
    {

        NUC.init('pa', GPP_TITLE, 'Idle', '9.1.0');

        NUC.callback.onStart(function(width, height)
        {
            size.width = width;
            size.height = height;
            showPlayable();
        })

        // NUC.callback.onDeviceData(function({os, osVersion, deviceId, deviceLanguage, apiLevel}) {
        //   // Device data
        // })

        NUC.callback.onDeviceData(function(data)
        {
            // Device data
        })

        // NUC.callback.onImpression(function(width, height) {
        //   // Game is visible
        //     size.width = width
        //     size.height = height
        //     NUC.trigger.ready();
        // })

        NUC.callback.onResize(function(width, height)
        {
            fireResizeEvent(width, height);
        })

        NUC.callback.onPause(function()
        {
            _onPause();
            // Pause tweens, timers, music and sound effects
        })

        NUC.callback.onResume(function()
        {
            _onResume();
            // Resume tweens, timers, music and sound effects
        })

        NUC.callback.onMute(function()
        {
            changeVolume(0);
            // Disable all sound effects // ALL, seriously
        })

        NUC.callback.onUnmute(function()
        {
            changeVolume(GP_API.vol);
            // Enable sound effects
        })

        globalContext.addEventListener("load", function()
        {
            NUC.trigger.ready();
        })
    }

    function gameStart()
    {
        _onResume()
        _onResize(size.width, size.height)
    }

    function gameClose()
    {
        _onPause()
    }

    function onUserTap(event)
    {
        if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent)
        {
            listeningToTouchEvents = true;
        }


        if (listeningToTouchEvents && event instanceof MouseEvent)
        {
            return null
        }

        GP_API.clicks += 1

        GP_API.emit("tap", GP_API.clicks)
    }

    function registerTouchHandlers()
    {
        if (!input_handlers_registered)
        {

            input_handlers_registered = true
            document.addEventListener('mousedown', onUserTap, false);
            document.addEventListener('touchend', onUserTap, false);

        }
    }

    function finishTapjoy()
    {
        (globalContext.TJ_API && globalContext.TJ_API.objectiveComplete && globalContext.TJ_API.objectiveComplete());
        (globalContext.TJ_API && globalContext.TJ_API.playableFinished && globalContext.TJ_API.playableFinished());
        (globalContext.TJ_API && globalContext.TJ_API.gameplayFinished && globalContext.TJ_API.gameplayFinished());

        return 300;
    }

    function checkNucleo()
    {
        return ("ironsource" == _network_exchange && (typeof NUC !== 'undefined' || globalContext.NUC || globalContext.isNucleo))
    }

    var listeners_events = {};

    function EventListeners()
    {
        this.a = [];
        this.n = 0;
    }

    function pushListener(event, fn, context, once)
    {
        var listeners = listeners_events[event]

        if (!listeners)
        {
            listeners = listeners_events[event] = new EventListeners();
        }

        listeners.a.push(fn, context || null, once || false);
        listeners.n += 3;
    }

    var GP_API = {

        v: "3.2.0",

        size: size,

        scale: 1,

        gscale: 1,

        clicks: 0,

        config: {},

        vol: "_{GENERAL_VOLUME}",

        once: function(event, fn, context)
        {
            pushListener(event, fn, context, true);
        },

        on: pushListener,

        off: function(event, fn, context)
        {
            var listeners = listeners_events[event]

            if (!listeners) return;

            var fnArray = listeners_events[event].a;

            if (!fn)
            {
                fnArray.length = 0;
            }

            context = context || null;

            for (var i = 0; i < fnArray.length; i += 3)
            {
                if (fnArray[i] == fn && fnArray[i + 1] == context)
                {
                    fnArray.splice(i, 3);
                    break;
                }
            }

            if (fnArray.length == 0)
            {
                delete listeners_events[event];
            }
        },

        emit: function(event, a1, a2, a3)
        {
            var listeners = listeners_events[event];

            if (!listeners) return;

            var fnArray = listeners.a;
            listeners.n = 0;

            var len = arguments.length;

            for (var i = 0; i < fnArray.length - listeners.n; i += 3)
            {
                if (len <= 1)
                    fnArray[i].call(fnArray[i + 1]);
                else if (len == 2)
                    fnArray[i].call(fnArray[i + 1], a1);
                else if (len == 3)
                    fnArray[i].call(fnArray[i + 1], a1, a2);
                else
                    fnArray[i].call(fnArray[i + 1], a1, a2, a3);

                if (fnArray[i + 2])
                {
                    fnArray.splice(i, 3);
                    i -= 3;
                }
            }

            if (fnArray.length == 0)
            {
                delete listeners_events[event];
            }
        },

        pause: function()
        {
            if (!paused)
            {
                paused = true;
                _onPause();
            }
        },

        resume: function()
        {
            if (paused)
            {
                paused = false;
                _onResume();
            }
        },

        intro: function(status)
        {

        },

        install: function()
        {
            if (clicked_install_allready)
            {
                return;
            }

            clicked_install_allready = true;

            GP_API.emit("install");

            setTimeout(function()
            {
                clicked_install_allready = false;
            }, 500)

            if ("ironsource" == _network_exchange || "lifestreet" == _network_exchange)
            {
                if (typeof mraid !== 'undefined' || globalContext.mraid)
                {
                    mraid.openStoreUrl(GPP_DESTINATION_URL);
                }
                else if (checkNucleo())
                {
                    NUC.trigger.convert(GPP_DESTINATION_URL);
                }
                else if (typeof dapi !== 'undefined' || globalContext.dapi)
                {
                    dapi.openStoreUrl(GPP_DESTINATION_URL);
                }
            }
            else
            {
                if ("toutiao" == _network_exchange)
                {
                    globalContext.openAppStore();
                }
                else if ("google" == _network_exchange)
                {
                    globalContext.toTheGoogle ? toTheGoogle() : ExitApi.exit();
                }
                else if ("mintegral" == _network_exchange)
                {
                    globalContext.install && globalContext.install();
                }
                else if ("_blank" == _network_exchange)
                {
                    globalContext.open(GPP_DESTINATION_URL, '_blank');
                }
                else if ("preview" == _network_exchange)
                {
                    globalContext.open(GPP_DESTINATION_URL, "_parent");
                }
                else if ("facebook" == _network_exchange)
                {
                    FbPlayableAd.onCTAClick();
                }
                else if ("vungle" == _network_exchange)
                {
                    //callSDK('download');
                    globalContext.parent && globalContext.parent.postMessage("download", "*");
                }
                else if ("unity" == _network_exchange)
                {
                    mraid.open(GPP_DESTINATION_URL);
                }
                else if ("applovin" == _network_exchange)
                {
                    mraid.open(GPP_DESTINATION_URL);
                }
                else if ("appreciate" == _network_exchange)
                {
                    mraid.open(GPP_DESTINATION_URL);
                }
                else if ("adcolony" == _network_exchange)
                {
                    mraid.openStore(GPP_DESTINATION_URL);
                }
                else if ("tapjoy" == _network_exchange)
                {
                    globalContext.TJ_API && globalContext.TJ_API.click();
                }
                else
                {
                    alert("DONE: " + GPP_DESTINATION_URL);
                }
            }
        },

        directInstall: function()
        {
            var timeout = 0;

            if ("tapjoy" == _network_exchange)
            {
                timeout = finishTapjoy();
            }

            GP_API.emit("finish");

            setTimeout(function()
            {
                GP_API.install();
            }, timeout)
        },

        finish: function(message)
        {
            var timeout = 0;

            if ("tapjoy" == _network_exchange)
            {
                timeout = finishTapjoy();
            }
            else if ("mintegral" == _network_exchange)
            {
                globalContext.gameEnd && globalContext.gameEnd();
            }
            else if ("vungle" == _network_exchange)
            {
                globalContext.parent && globalContext.parent.postMessage("complete", "*");
            }

            GP_API.emit("finish", message || "win");

            return timeout;
        },

        retry: function()
        {
            GP_API.emit("retry");

            if (checkNucleo())
            {
                NUC.trigger.tryAgain();
            }
        },

        googleTitle(position, horizontalPadding, verticalPadding, scale, reposition)
        {
            if (globalContext.goo && globalContext.goo._set)
            {
                globalContext.goo._set(position, horizontalPadding, verticalPadding, scale, reposition);
            }
        },

        init: function()
        {
            _network_exchange = GPP_NETWORK;

            GP_API.emit("init");

            // if (_network_exchange == "ironsource" || _network_exchange == "tapjoy" || _network_exchange == "unity" || _network_exchange == "mintegral")
            // {
            //     this.offset = true;
            // }

            if (typeof mraid !== 'undefined' || globalContext.mraid || isMraid())
            {
                if (mraid.getState() !== 'ready' && "adcolony" !== _network_exchange)
                {
                    mraid.addEventListener('ready', checkViewable);
                }
                else
                {
                    checkViewable();
                }
            }
            else if (globalContext.isNucleo)
            {
                _initNucleoCallbacks();
            }
            else if (globalContext.isDapi)
            {
                globalContext.addEventListener("load", function()
                {
                    (dapi.isReady()) ? onDapiReadyCallback() : dapi.addEventListener("ready", onDapiReadyCallback);
                })
            }
            else
            {

                globalContext.onload = function()
                {
                    if ("mintegral" == _network_exchange)
                    {
                        globalContext.gameStart = gameStart;
                        globalContext.gameClose = gameClose;
                    }

                    showPlayable();
                }

                if ("tapjoy" == _network_exchange)
                {
                    var t = {
                        skipAd: function()
                        {
                            try
                            {
                                _GGAME.showPopup && _GGAME.showPopup();
                            }
                            catch (e)
                            {
                                var t = "Could not skip ad! | " + e;
                                console.warn(t);
                            }
                        }
                    };

                    globalContext.TJ_API && globalContext.TJ_API.setPlayableAPI && globalContext.TJ_API.setPlayableAPI(t);

                }
            }

            globalContext.addEventListener('resize', function()
            {
                _onResize();
            }, false);
        },

        resize: function()
        {
            _onResize(size.width, size.height);
        },

        render: function()
        {
            if (!_renderable)
            {

                if (globalContext.game)
                {
                    _GGAME = globalContext.game;
                }

                _renderable = true;

                GP_API.emit("render");

                registerTouchHandlers();

                if ("mintegral" == _network_exchange)
                {
                    this.resize();
                    _onPause();
                    globalContext.gameReady && globalContext.gameReady();
                }
                else
                {
                    if ("tapjoy" == _network_exchange)
                    {
                        (globalContext.TJ_API && globalContext.TJ_API.setPlayableBuild({
                            orientation: PL("portrait", "landscape"),
                            buildID: getBuildVersion()
                        }));
                    }

                    this.resize();
                }

                changeVolume(this.vol);

                GP_API.emit("postrender");
            }
        }
    }

    return GP_API;

})(window);