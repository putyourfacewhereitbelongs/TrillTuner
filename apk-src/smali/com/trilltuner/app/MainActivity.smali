.class public Lcom/trilltuner/app/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# Trill Tuner — the Android shell. Loads the bundled web app from
# file:///android_asset/index.html with a permissive, offline-ready WebView:
# JS + DOM storage on, media autoplay allowed, mic permission granted via
# TChrome, and a small JS bridge ("Android") for LAN address, sharing,
# keep-screen-on and the app version.

.field private wv:Landroid/webkit/WebView;


.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method


.method public onCreate(Landroid/os/Bundle;)V
    .locals 4

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

    # wv.setWebChromeClient(new TChrome());
    new-instance v2, Lcom/trilltuner/app/TChrome;
    invoke-direct {v2}, Lcom/trilltuner/app/TChrome;-><init>()V
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
