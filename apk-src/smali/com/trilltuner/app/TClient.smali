.class public Lcom/trilltuner/app/TClient;
.super Landroid/webkit/WebViewClient;
.source "TClient.java"

# Default WebViewClient behaviour (stay inside the WebView) — declared as
# its own class so the shell reads clearly and can grow rules later.

.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method
