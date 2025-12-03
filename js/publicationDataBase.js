function simpligyFirstNameSingleWordWithHyphen(firstName) {
    return firstName.split("-").map(part => part.charAt(0) + ".").join("-");
}

function simplifyFirstName(firstName) {
    return firstName.split(/\s+/).map(part => simpligyFirstNameSingleWordWithHyphen(part)).join(" ");
}

function formatAuthorSingle(author, fullName) {
    if (fullName) {
        if (author === "Yefan Zhi") return "<i>Yefan Zhi</i>"
        return author.replace("|", "");
    } else {
        if (author === "Yefan Zhi") return "<i>Y. Zhi</i>"

        var sep = author.lastIndexOf("|");
        if (sep === -1) sep = author.lastIndexOf(" ");
        var firstName = author.slice(0, sep);
        var lastName = author.slice(sep + 1);
        return simplifyFirstName(firstName) + " " + lastName;
    }
}

function formatAuthors(authorString, fullNames) {
    var authors = authorString.split(", ");
    var tail = "";
    if (authors.length > 5) {
        authors = authors.slice(0, 5);
        tail = " et al.";
    }
    return authors.map(author => formatAuthorSingle(author, fullNames)).join(", ") + tail;
}

function renderItem(pub, fullNames) {
    var authors = formatAuthors(pub.authors, fullNames);

    var venues = [];
    if (pub.venue) venues.push(pub.venue);
    if (pub.year && typeof pub.year === 'number') venues.push(pub.year);
    if (pub.venue_note) venues.push(pub.venue_note);

    var notes = [];
    if (pub.address) notes.push(pub.address);
    if (pub.note) notes.push(pub.note);
    if (pub.highlight_note) notes.push(`<span class="hl">${pub.highlight_note}</span>`);
    var note = notes.join(", ");
    if (note) venues.push(`<i>${note}</i>`);

    var c1 = (venues.length === 0) ? "" : venues.join(" ");

    var links = [];

    var parts = [];
    for (var i = 0; i < pub.links.length; i++) {
        var obj = pub.links[i];
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                parts.push(`<a href="${obj[key]}">[${key}]</a>`);
            }
        }
    }
    var linksStr = parts.join(" ");
    if (linksStr) {
        c1 += ` ${linksStr}`;
    }

    var shortTitleWords = pub.title.replace(':', '').split(' ').slice(0, 5);
    return `<!-- ${pub.type_key} -->
<div class="image-text-container" id=${shortTitleWords.join("")}>
<div>
<img src="/index/${shortTitleWords.join(' ')}.jpg" alt="${pub.title}"/>
</div>
<div><p><strong>${pub.title}</strong>
${authors}
<span class="c1">${c1}</span></p>
</div>
</div>`;
}


async function loadData() {
    // If your site is under /blog/, DO NOT start with a leading slash
    const res = await fetch('/publications.json');
    const db = await res.json();
    return db.publications || [];
}


async function loadResearchData() {
    // If your site is under /blog/, DO NOT start with a leading slash
    const res = await fetch('/research.json');
    const db = await res.json();
    return db.research || [];
}

async function showByFeatured(fullNameSwitch) {
    await showByKey(fullNameSwitch, 'featured', ["Featured", "Other Publications"]);
}

async function showByYear(fullNameSwitch) {
    await showByKey(fullNameSwitch, 'year', ["Under Review"]);
}

async function showByTopic(fullNameSwitch) {
    await showByKey(fullNameSwitch, "topic", ["3D Concrete Printing", "Structural Systems by 3D Concrete Printing", "Multi-Material Extrusion", "Polyhedral Graphic Statics", "Data-Driven Design"]);
}

async function showByType(fullNameSwitch) {
    await showByKey(fullNameSwitch, "type", ["Under Review", "Journal Papers (Peer-Reviewed)", "Conference Papers (Peer-Reviewed)", "Book Chapters"]);
}

async function showByRole(fullNameSwitch) {
    await showByKey(fullNameSwitch, "role", ["As First Author", "As Major Contributor", "As Supporting Author"]);
}

async function showByVenue(fullNameSwitch) {
    await showByKey(fullNameSwitch, "venue_full", ["Under Review"], ["Book Chapters"], false);
}

async function showByKey(fullNameSwitch, keyString, defaultKeys, lastKeys = [], keyReverse = true) {

    const container = document.getElementById('research-list');
    const publications = await loadData();
    container.innerHTML = '';

    var dict = {};
    for (var i = 0; i < publications.length; i++) {
        var pub = publications[i];
        var key = pub[keyString];
        if (!dict[key]) dict[key] = [];
        dict[key].push(pub);
    }
    var allKeys = defaultKeys.slice();

    var sortedKeys = Object.keys(dict).sort();
    if (keyReverse)
        sortedKeys.reverse();

    for (var i = 0; i < sortedKeys.length; i++) {
        var key = sortedKeys[i];
        if (!allKeys.includes(key) && !lastKeys.includes(key)) {
            allKeys.push(key);
        }
    }
    allKeys = [...allKeys, ...lastKeys];

    for (var i = 0; i < allKeys.length; i++) {
        var key = allKeys[i];
        var keyPubs = dict[key];
        if (!keyPubs) continue;
        container.innerHTML += `<h2>${key}</h2>`;
        container.innerHTML += keyPubs.map(pub => renderItem(pub, fullNameSwitch)).join('');
    }
}

function showTab(e) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    refresh();
}

function isActive(idString) {
    const element = document.getElementById(idString);
    return element.classList.contains('active');
}

function showName(e) {
    document.querySelectorAll('.name-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    refresh();
}

function refresh() {
    var fullNameSwitch = isActive('full-name');
    if (isActive('content-by-featured')) { showByFeatured(fullNameSwitch); }
    else if (isActive('content-by-year')) { showByYear(fullNameSwitch); }
    else if (isActive('content-by-topic')) { showByTopic(fullNameSwitch); }
    else if (isActive('content-by-type')) { showByType(fullNameSwitch); }
    else if (isActive('content-by-role')) { showByRole(fullNameSwitch); }
    else if (isActive('content-by-venue')) { showByVenue(fullNameSwitch); }
}

async function refreshSelected(keyString) {
    const publications = await loadData();
    const research = await loadResearchData();

    var fullNameSwitch = isActive(keyString + "-full-name");

    var container = document.getElementById(keyString);
    const titles = research.find(r => r.name === keyString).titles;
    var pubs = [];
    for (var i = 0; i < titles.length; i++) {
        pubs.push(publications.find(r => r.title === titles[i]));
    }
    container.innerHTML = pubs.map(pub => renderItem(pub, fullNameSwitch)).join('');
}

function showResearchName(e, keyString) {
    document.querySelectorAll('.name-tab').forEach(tab => {
        if (tab.classList.contains(keyString)) tab.classList.remove('active');
    });
    e.target.classList.add('active');
    refreshSelected(keyString);
}