(() => {
  const dialog = document.querySelector("#location-dialog");
  const closeButton = dialog?.querySelector(".dialog-close");
  const statusBox = document.querySelector("#location-status");
  const resultBox = document.querySelector("#location-result");
  const errorBox = document.querySelector("#location-error");
  const errorText = document.querySelector("#location-error-text");
  const accuracyText = document.querySelector("#accuracy-text");
  const shareButton = document.querySelector("#share-location");
  const smsLink = document.querySelector("#sms-location");
  const copyButton = document.querySelector("#copy-location");
  const retryButton = document.querySelector("#retry-location");
  const copyLabel = copyButton?.querySelector(".button-label");

  let mapUrl = "";
  let shareText = "";

  const showState = (state) => {
    statusBox.hidden = state !== "loading";
    resultBox.hidden = state !== "ready";
    errorBox.hidden = state !== "error";
  };

  const copyToClipboard = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  };

  const getLocation = () => {
    showState("loading");

    if (!navigator.geolocation) {
      errorText.textContent = "Този браузър не поддържа определяне на местоположение.";
      showState("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);
        const accuracy = Math.max(1, Math.round(position.coords.accuracy));

        mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        shareText = "Нуждая се от пътна помощ. Това е моето местоположение:";
        accuracyText.textContent = `Точност: приблизително ${accuracy} м.`;

        const separator = /iPad|iPhone|iPod/.test(navigator.userAgent) ? "&" : "?";
        smsLink.href = `sms:${separator}body=${encodeURIComponent(`${shareText} ${mapUrl}`)}`;
        showState("ready");
      },
      (error) => {
        const messages = {
          1: "Достъпът до местоположението е отказан. Разрешете го от настройките на браузъра и опитайте отново.",
          2: "Местоположението не може да бъде определено в момента. Проверете GPS и връзката си.",
          3: "Определянето на местоположението отне твърде дълго. Опитайте отново."
        };

        errorText.textContent = messages[error.code] || "Възникна неочаквана грешка. Опитайте отново.";
        showState("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000
      }
    );
  };

  const openLocationDialog = () => {
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    getLocation();
  };

  document.querySelectorAll(".js-location").forEach((button) => {
    button.addEventListener("click", openLocationDialog);
  });

  closeButton?.addEventListener("click", () => dialog.close());
  retryButton?.addEventListener("click", getLocation);

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  shareButton?.addEventListener("click", async () => {
    if (!mapUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Пътна помощ Велико Търново",
          text: shareText,
          url: mapUrl
        });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }

    try {
      await copyToClipboard(`${shareText} ${mapUrl}`);
      if (copyLabel) copyLabel.textContent = "Линкът е копиран";
    } catch {
      window.open(mapUrl, "_blank", "noopener,noreferrer");
    }
  });

  copyButton?.addEventListener("click", async () => {
    if (!mapUrl) return;

    try {
      await copyToClipboard(mapUrl);
      copyButton.textContent = "Линкът е копиран";
      window.setTimeout(() => {
        if (copyLabel) copyLabel.textContent = "Копирай линка";
      }, 2400);
    } catch {
      window.open(mapUrl, "_blank", "noopener,noreferrer");
    }
  });

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
