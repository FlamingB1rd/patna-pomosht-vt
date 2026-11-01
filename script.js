(() => {
  const dialog = document.querySelector("#location-dialog");
  const closeButton = dialog?.querySelector(".dialog-close");
  const statusBox = document.querySelector("#location-status");
  const resultBox = document.querySelector("#location-result");
  const errorBox = document.querySelector("#location-error");
  const errorText = document.querySelector("#location-error-text");
  const locationHelpText = document.querySelector("#location-help-text");
  const accuracyText = document.querySelector("#accuracy-text");
  const shareButton = document.querySelector("#share-location");
  const smsLink = document.querySelector("#sms-location");
  const copyButton = document.querySelector("#copy-location");
  const retryButton = document.querySelector("#retry-location");
  const copyLabel = copyButton?.querySelector(".button-label");

  let mapUrl = "";
  let shareText = "";
  let permissionStatus = null;
  let requestNumber = 0;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = platform === "Android" || /Android/i.test(userAgent);

  const showState = (state) => {
    statusBox.hidden = state !== "loading";
    resultBox.hidden = state !== "ready";
    errorBox.hidden = state !== "error";
  };

  const setPermissionHelp = () => {
    if (!locationHelpText) return;

    if (isIOS) {
      locationHelpText.textContent = "На iPhone/iPad: отворете Настройки → Поверителност и сигурност → Услуги за местоположение и разрешете достъпа за браузъра. В Safari можете и от aA → Настройки за уебсайта → Местоположение → Разрешаване.";
      return;
    }

    if (isAndroid) {
      locationHelpText.textContent = "На Android: натиснете иконата до адреса на сайта → Разрешения → Местоположение → Разрешаване. Проверете също дали Местоположение/GPS е включено в телефона.";
      return;
    }

    locationHelpText.textContent = "Натиснете иконата до адреса на сайта → Разрешения за сайта → Местоположение → Разрешаване. След това натиснете „Провери отново“.";
  };

  const showLocationError = (message) => {
    errorText.textContent = message;
    setPermissionHelp();
    showState("error");
  };

  const readPermissionState = async () => {
    if (!navigator.permissions?.query) return "unknown";

    try {
      permissionStatus = await navigator.permissions.query({ name: "geolocation" });
      return permissionStatus.state;
    } catch {
      return "unknown";
    }
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

  const usePosition = (position, currentRequest) => {
    if (currentRequest !== requestNumber) return;

    const latitude = position.coords.latitude.toFixed(6);
    const longitude = position.coords.longitude.toFixed(6);
    const accuracy = Math.max(1, Math.round(position.coords.accuracy));

    mapUrl = "https://www.google.com/maps?q=" + latitude + "," + longitude;
    shareText = "Нуждая се от пътна помощ. Това е моето местоположение:";
    accuracyText.textContent = "Точност: приблизително " + accuracy + " м.";

    const separator = isIOS ? "&" : "?";
    smsLink.href = "sms:" + separator + "body=" + encodeURIComponent(shareText + " " + mapUrl);
    showState("ready");
  };

  const handleLocationFailure = (error, currentRequest, allowFallback) => {
    if (currentRequest !== requestNumber) return;

    if (allowFallback && (error.code === 2 || error.code === 3)) {
      navigator.geolocation.getCurrentPosition(
        (position) => usePosition(position, currentRequest),
        (fallbackError) => handleLocationFailure(fallbackError, currentRequest, false),
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 }
      );
      return;
    }

    const messages = {
      1: "Достъпът до местоположението е отказан. Браузърът няма да попита отново, докато не го разрешите от настройките за този сайт.",
      2: "Местоположението не може да бъде определено в момента. Проверете дали GPS е включен и дали имате интернет връзка.",
      3: "Определянето на местоположението отне твърде дълго. Излезте на открито или включете GPS и опитайте отново."
    };

    showLocationError(messages[error.code] || "Възникна неочаквана грешка. Опитайте отново.");
  };

  const getLocation = async () => {
    const currentRequest = ++requestNumber;
    showState("loading");

    if (!navigator.geolocation) {
      showLocationError("Този браузър не поддържа определяне на местоположение.");
      return;
    }

    const permissionState = await readPermissionState();
    if (currentRequest !== requestNumber) return;

    if (permissionState === "denied") {
      showLocationError("Достъпът до местоположението е блокиран за този сайт. Разрешете го от настройките на браузъра и натиснете „Провери отново“.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => usePosition(position, currentRequest),
      (error) => handleLocationFailure(error, currentRequest, true),
      { enableHighAccuracy: true, timeout: 16000, maximumAge: 60000 }
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
      await copyToClipboard(shareText + " " + mapUrl);
      if (copyLabel) copyLabel.textContent = "Линкът е копиран";
    } catch {
      window.open(mapUrl, "_blank", "noopener,noreferrer");
    }
  });

  copyButton?.addEventListener("click", async () => {
    if (!mapUrl) return;

    try {
      await copyToClipboard(mapUrl);
      if (copyLabel) copyLabel.textContent = "Линкът е копиран";
      window.setTimeout(() => {
        if (copyLabel) copyLabel.textContent = "Копирай линка";
      }, 2400);
    } catch {
      window.open(mapUrl, "_blank", "noopener,noreferrer");
    }
  });

  const gallery = document.querySelector(".work-gallery");
  const galleryPrev = document.querySelector(".gallery-prev");
  const galleryNext = document.querySelector(".gallery-next");

  const updateGalleryButtons = () => {
    if (!gallery || !galleryPrev || !galleryNext) return;
    const maxScroll = gallery.scrollWidth - gallery.clientWidth;
    galleryPrev.disabled = gallery.scrollLeft <= 4;
    galleryNext.disabled = gallery.scrollLeft >= maxScroll - 4;
  };

  const moveGallery = (direction) => {
    if (!gallery) return;
    const firstCard = gallery.querySelector(".work-photo");
    const gap = Number.parseFloat(getComputedStyle(gallery).columnGap) || 12;
    const distance = (firstCard?.getBoundingClientRect().width || gallery.clientWidth * 0.82) + gap;
    gallery.scrollBy({ left: direction * distance, behavior: "smooth" });
  };

  galleryPrev?.addEventListener("click", () => moveGallery(-1));
  galleryNext?.addEventListener("click", () => moveGallery(1));
  gallery?.addEventListener("scroll", updateGalleryButtons, { passive: true });
  window.addEventListener("resize", updateGalleryButtons);
  updateGalleryButtons();

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
