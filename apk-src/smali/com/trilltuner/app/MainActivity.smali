.class public Lcom/trilltuner/app/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# Trill Tuner — the Android shell. Loads the bundled web app from
# file:///android_asset/index.html with a permissive, offline-ready WebView:
# JS + DOM storage on, media autoplay allowed, mic permission granted via
# TChrome (plus the Android runtime grant asked for below), file inputs wired
# to the system picker through TChrome.onShowFileChooser, and a small JS bridge
# ("Android") for LAN address, sharing, keep-screen-on and the app version.

.field private wv:Landroid/webkit/WebView;
.field private chrome:Lcom/trilltuner/app/TChrome;


.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method


.method public onCreate(Landroid/os/Bundle;)V
    .locals 5

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    # WebView wv = new WebView(this);
    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lcom/trilltuner/app/MainActivity;->wv:Landroid/webkit/WebView;

    # WebSettings s = wv.getSettings();
    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1

    # s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true);
    # s.setAllowFileAccess(true); s.setMediaPlaybackRequiresUserGesture(false);
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    # wv.setWebViewClient(new TClient());
    new-instance v2, Lcom/trilltuner/app/TClient;
    invoke-direct {v2}, Lcom/trilltuner/app/TClient;-><init>()V
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    # TChrome chrome = new TChrome(this); wv.setWebChromeClient(chrome);
    new-instance v2, Lcom/trilltuner/app/TChrome;
    invoke-direct {v2, p0}, Lcom/trilltuner/app/TChrome;-><init>(Landroid/app/Activity;)V
    iput-object v2, p0, Lcom/trilltuner/app/MainActivity;->chrome:Lcom/trilltuner/app/TChrome;
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    # wv.addJavascriptInterface(new TBridge(this, wv), "Android");
    new-instance v2, Lcom/trilltuner/app/TBridge;
    invoke-direct {v2, p0, v0}, Lcom/trilltuner/app/TBridge;-><init>(Landroid/content/Context;Landroid/webkit/WebView;)V
    const-string v3, "Android"
    invoke-virtual {v0, v2, v3}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    # wv.loadUrl("file:///android_asset/index.html");
    const-string v2, "file:///android_asset/index.html"
    invoke-virtual {v0, v2}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    # setContentView(wv);
    invoke-virtual {p0, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V

    # Runtime grants. The manifest lists them; Android 6+ still has to ask.
    # RECORD_AUDIO is the tuner. POST_NOTIFICATIONS is Android 13+.
    # READ_MEDIA_AUDIO / READ_EXTERNAL_STORAGE is the song-file picker.
    # BLUETOOTH_CONNECT is headphones on Android 12+. Already-granted entries
    # are ignored, so it is safe to ask for the whole set every launch.
    const/4 v1, 0x5
    new-array v1, v1, [Ljava/lang/String;
    const/4 v2, 0x0
    const-string v3, "android.permission.RECORD_AUDIO"
    aput-object v3, v1, v2
    const/4 v2, 0x1
    const-string v3, "android.permission.POST_NOTIFICATIONS"
    aput-object v3, v1, v2
    const/4 v2, 0x2
    const-string v3, "android.permission.READ_MEDIA_AUDIO"
    aput-object v3, v1, v2
    const/4 v2, 0x3
    const-string v3, "android.permission.READ_EXTERNAL_STORAGE"
    aput-object v3, v1, v2
    const/4 v2, 0x4
    const-string v3, "android.permission.BLUETOOTH_CONNECT"
    aput-object v3, v1, v2

    const/16 v2, 0x67
    invoke-virtual {p0, v1, v2}, Landroid/app/Activity;->requestPermissions([Ljava/lang/String;I)V

    return-void
.end method


# The file picker opened by TChrome.onShowFileChooser answers here; hand the
# chosen file back to the page so <input type="file"> behaves like a browser.
.method protected onActivityResult(IILandroid/content/Intent;)V
    .locals 3

    const/16 v0, 0x65
    if-ne p1, v0, :cond_super

    const/4 v0, 0x0

    if-eqz p3, :cond_deliver
    const/4 v1, -0x1
    if-ne p2, v1, :cond_deliver

    invoke-virtual {p3}, Landroid/content/Intent;->getData()Landroid/net/Uri;
    move-result-object v0

    if-nez v0, :cond_deliver

    # some providers return the file as a ClipData item instead
    invoke-virtual {p3}, Landroid/content/Intent;->getClipData()Landroid/content/ClipData;
    move-result-object v1
    if-eqz v1, :cond_deliver
    invoke-virtual {v1}, Landroid/content/ClipData;->getItemCount()I
    move-result v2
    if-lez v2, :cond_deliver
    const/4 v2, 0x0
    invoke-virtual {v1, v2}, Landroid/content/ClipData;->getItemAt(I)Landroid/content/ClipData$Item;
    move-result-object v1
    invoke-virtual {v1}, Landroid/content/ClipData$Item;->getUri()Landroid/net/Uri;
    move-result-object v0

    :cond_deliver
    iget-object v1, p0, Lcom/trilltuner/app/MainActivity;->chrome:Lcom/trilltuner/app/TChrome;
    if-eqz v1, :cond_return
    invoke-virtual {v1, v0}, Lcom/trilltuner/app/TChrome;->deliverFile(Landroid/net/Uri;)V

    :cond_return
    return-void

    :cond_super
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    return-void
.end method


.method public onBackPressed()V
    .locals 2

    # if (wv != null && wv.canGoBack()) { wv.goBack(); return; }
    iget-object v0, p0, Lcom/trilltuner/app/MainActivity;->wv:Landroid/webkit/WebView;
    if-eqz v0, :cond_super
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v1
    if-eqz v1, :cond_super
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void

    :cond_super
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method


.method protected onPause()V
    .locals 1

    invoke-super {p0}, Landroid/app/Activity;->onPause()V
    iget-object v0, p0, Lcom/trilltuner/app/MainActivity;->wv:Landroid/webkit/WebView;
    if-eqz v0, :cond_done
    invoke-virtual {v0}, Landroid/webkit/WebView;->onPause()V

    :cond_done
    return-void
.end method


.method protected onResume()V
    .locals 1

    invoke-super {p0}, Landroid/app/Activity;->onResume()V
    iget-object v0, p0, Lcom/trilltuner/app/MainActivity;->wv:Landroid/webkit/WebView;
    if-eqz v0, :cond_done
    invoke-virtual {v0}, Landroid/webkit/WebView;->onResume()V

    :cond_done
    return-void
.end method
