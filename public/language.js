$(document).ready(function() {
    // Initialize language
    const savedLang = localStorage.getItem('lang') || 'en';
    setLanguage(savedLang);
    updateToggleText(savedLang);

    // Toggle language on click
    $('.lang-toggle').on('click', function() {
        const currentLang = $('html').attr('lang');
        const newLang = currentLang === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
        updateToggleText(newLang);
        location.reload();
    });

    function updateToggleText(lang) {
        $('.lang-toggle').text(lang === 'en' ? 'ع' : 'E');
    }

    function setLanguage(lang) {
        $('html').attr('lang', lang);
        $('html').attr('dir', lang === 'ar' ? 'rtl' : 'ltr');
        $('#rtl-stylesheet').prop('disabled', lang !== 'ar');

        $('[data-en], [data-ar]').each(function() {
            const text = $(this).data(lang);
            if (text) {
                $(this).text(text);
            }
        });

        $('[data-ph-en], [data-ph-ar]').each(function() {
            const placeholder = $(this).data(`ph-${lang}`);
            if (placeholder) {
                $(this).attr('placeholder', placeholder);
            }
        });

        localStorage.setItem('lang', lang);

        if (typeof loadCategories === 'function') loadCategories(lang);
        if (typeof loadBasket === 'function') loadBasket(lang);
    }
});
