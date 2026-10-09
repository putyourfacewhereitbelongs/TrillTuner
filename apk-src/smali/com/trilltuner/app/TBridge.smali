.class public Lcom/trilltuner/app/TBridge;
.super Ljava/lang/Object;
.source "TBridge.java"

# The "Android" JavascriptInterface. Exposes five things the web app uses
# when it runs inside this APK:
#   getHostBase()    -> "http://<lan-ip>:3000" for the QR codes (no server
#                       needed to discover it), or the WebRTC fallback is
#                       used by the web version instead
#   getVersionName() -> the APK's versionName ("2.1.0")
#   keepScreenOn(b)  -> keep the display awake in gig mode
#   shareText(s)     -> native Android share sheet
#   openUrl(s)       -> open a link (e.g. the APK download) in the browser

.field private final ctx:Landroid/content/Context;
.field private final wv:Landroid/webkit/WebView;


.method public constructor <init>(Landroid/content/Context;Landroid/webkit/WebView;)V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/trilltuner/app/TBridge;->ctx:Landroid/content/Context;
    iput-object p2, p0, Lcom/trilltuner/app/TBridge;->wv:Landroid/webkit/WebView;

    return-void
.end method


.method public getHostBase()Ljava/lang/String;
    .locals 6
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    # Walk the network interfaces; first non-loopback IPv4 wins.
    invoke-static {}, Ljava/net/NetworkInterface;->getNetworkInterfaces()Ljava/util/Enumeration;
    move-result-object v0

    :loop_outer
    invoke-interface {v0}, Ljava/util/Enumeration;->hasMoreElements()Z
    move-result v1
    if-eqz v1, :done
    invoke-interface {v0}, Ljava/util/Enumeration;->nextElement()Ljava/lang/Object;
    move-result-object v1
    check-cast v1, Ljava/net/NetworkInterface;
    invoke-virtual {v1}, Ljava/net/NetworkInterface;->isLoopback()Z
    move-result v2
    if-nez v2, :loop_outer
    invoke-virtual {v1}, Ljava/net/NetworkInterface;->getInetAddresses()Ljava/util/Enumeration;
    move-result-object v2

    :loop_inner
    invoke-interface {v2}, Ljava/util/Enumeration;->hasMoreElements()Z
    move-result v3
    if-eqz v3, :loop_outer
    invoke-interface {v2}, Ljava/util/Enumeration;->nextElement()Ljava/lang/Object;
    move-result-object v3
    check-cast v3, Ljava/net/InetAddress;
    invoke-virtual {v3}, Ljava/net/InetAddress;->isLoopbackAddress()Z
    move-result v4
    if-nez v4, :loop_inner
    invoke-virtual {v3}, Ljava/net/InetAddress;->getHostAddress()Ljava/lang/String;
    move-result-object v4
    const-string v5, ":"
    invoke-virtual {v4, v5}, Ljava/lang/String;->indexOf(Ljava/lang/String;)I
    move-result v5
    if-ltz v5, :found
    goto :loop_inner

    :found
    const-string v5, "http://"
    invoke-virtual {v5, v4}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v5
    const-string v4, ":3000"
    invoke-virtual {v5, v4}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    return-object v0

    :done
    const-string v0, "http://localhost:3000"
    return-object v0
.end method


.method public getVersionName()Ljava/lang/String;
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    iget-object v0, p0, Lcom/trilltuner/app/TBridge;->ctx:Landroid/content/Context;
    invoke-virtual {v0}, Landroid/content/Context;->getPackageManager()Landroid/content/pm/PackageManager;
    move-result-object v0
    iget-object v1, p0, Lcom/trilltuner/app/TBridge;->ctx:Landroid/content/Context;
    invoke-virtual {v1}, Landroid/content/Context;->getPackageName()Ljava/lang/String;
    move-result-object v1
    const/4 v2, 0x0
    invoke-virtual {v0, v1, v2}, Landroid/content/pm/PackageManager;->getPackageInfo(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;
    move-result-object v0
    iget-object v0, v0, Landroid/content/pm/PackageInfo;->versionName:Ljava/lang/String;
    return-object v0
.end method


.method public keepScreenOn(Z)V
    .locals 1
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    iget-object v0, p0, Lcom/trilltuner/app/TBridge;->wv:Landroid/webkit/WebView;
    if-eqz v0, :done
    invoke-virtual {v0, p1}, Landroid/webkit/WebView;->setKeepScreenOn(Z)V

    :done
    return-void
.end method


.method public shareText(Ljava/lang/String;)V
    .locals 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    new-instance v0, Landroid/content/Intent;
    const-string v1, "android.intent.action.SEND"
    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    const-string v1, "text/plain"
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setType(Ljava/lang/String;)Landroid/content/Intent;
    const-string v1, "android.intent.extra.TEXT"
    invoke-virtual {v0, v1, p1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;
    const-string v1, "Share Trill Tuner"
    invoke-static {v0, v1}, Landroid/content/Intent;->createChooser(Landroid/content/Intent;Ljava/lang/CharSequence;)Landroid/content/Intent;
    move-result-object v0
    iget-object v1, p0, Lcom/trilltuner/app/TBridge;->ctx:Landroid/content/Context;
    invoke-virtual {v1, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    return-void
.end method


.method public openUrl(Ljava/lang/String;)V
    .locals 2
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    new-instance v0, Landroid/content/Intent;
    const-string v1, "android.intent.action.VIEW"
    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V
    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/content/Intent;->setData(Landroid/net/Uri;)Landroid/content/Intent;
    iget-object v1, p0, Lcom/trilltuner/app/TBridge;->ctx:Landroid/content/Context;
    invoke-virtual {v1, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V

    return-void
.end method
