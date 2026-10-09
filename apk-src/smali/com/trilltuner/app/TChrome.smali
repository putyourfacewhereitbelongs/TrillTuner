.class public Lcom/trilltuner/app/TChrome;
.super Landroid/webkit/WebChromeClient;
.source "TChrome.java"

# Grants the mic permission the tuner asks for, and — the part that used to be
# missing — answers the file inputs the Stem lab, the tab maker and the recorder
# use. A WebView never opens a file picker on its own: without
# onShowFileChooser every tap on “Drop a song file here” is silently swallowed,
# which is exactly how the Stem lab looked completely dead inside the Android
# app. The manifest permission (RECORD_AUDIO) plus the runtime grant requested
# in MainActivity are the real gate for audio capture.

.field private activity:Landroid/app/Activity;
.field private pending:Landroid/webkit/ValueCallback;

.method public constructor <init>(Landroid/app/Activity;)V
    .locals 0

    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    iput-object p1, p0, Lcom/trilltuner/app/TChrome;->activity:Landroid/app/Activity;

    return-void
.end method


.method public onPermissionRequest(Landroid/webkit/PermissionRequest;)V
    .locals 1

    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->getResources()[Ljava/lang/String;
    move-result-object v0
    invoke-virtual {p1, v0}, Landroid/webkit/PermissionRequest;->grant([Ljava/lang/String;)V

    return-void
.end method


# A file input was tapped: open the system picker and keep the page's callback
# until the picker answers (MainActivity.onActivityResult → deliverFile).
.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .locals 3

    iput-object p2, p0, Lcom/trilltuner/app/TChrome;->pending:Landroid/webkit/ValueCallback;

    # Intent intent = params.createIntent();  (ACTION_GET_CONTENT, built from accept=)
    invoke-virtual {p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v0

    if-nez v0, :cond_pick

    # no picker available at all: answer "nothing chosen" so the page never hangs
    const/4 v0, 0x0
    invoke-virtual {p0, v0}, Lcom/trilltuner/app/TChrome;->deliverFile(Landroid/net/Uri;)V
    const/4 v0, 0x1
    return v0

    :cond_pick
    # activity.startActivityForResult(intent, REQUEST_FILE);
    iget-object v1, p0, Lcom/trilltuner/app/TChrome;->activity:Landroid/app/Activity;
    const/16 v2, 0x65
    invoke-virtual {v1, v0, v2}, Landroid/app/Activity;->startActivityForResult(Landroid/content/Intent;I)V

    const/4 v0, 0x1

    return v0
.end method


# Called from MainActivity.onActivityResult with the picked file (null when the
# picker was cancelled) — hands the uri back to the web page's callback.
.method public deliverFile(Landroid/net/Uri;)V
    .locals 3

    iget-object v0, p0, Lcom/trilltuner/app/TChrome;->pending:Landroid/webkit/ValueCallback;
    if-eqz v0, :cond_done

    const/4 v1, 0x0
    iput-object v1, p0, Lcom/trilltuner/app/TChrome;->pending:Landroid/webkit/ValueCallback;

    if-nez p1, :cond_uri

    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    return-void

    :cond_uri
    const/4 v1, 0x1
    new-array v1, v1, [Landroid/net/Uri;
    const/4 v2, 0x0
    aput-object p1, v1, v2
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V

    :cond_done
    return-void
.end method
