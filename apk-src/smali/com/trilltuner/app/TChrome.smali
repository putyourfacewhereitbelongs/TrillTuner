.class public Lcom/trilltuner/app/TChrome;
.super Landroid/webkit/WebChromeClient;
.source "TChrome.java"

# Grants the mic permission the tuner asks for. The app only ever requests
# audio capture; the manifest permission (RECORD_AUDIO) is the real gate.

.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V

    return-void
.end method


.method public onPermissionRequest(Landroid/webkit/PermissionRequest;)V
    .locals 1

    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->getResources()[Ljava/lang/String;
    move-result-object v0
    invoke-virtual {p1, v0}, Landroid/webkit/PermissionRequest;->grant([Ljava/lang/String;)V

    return-void
.end method
