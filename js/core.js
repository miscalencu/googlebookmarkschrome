var bookmarks = new Array();
var lastReadDate = new Date();
var noLoggedIn = false;
var currentLabel = "";
var docXML;

function setDefaultVariables() {
	if (!localStorage.readTimeout)
		localStorage.readTimeout = "10";

	if (!localStorage.lastQuery)
		localStorage.lastQuery = "";

	if (!localStorage.showTotalBookmarks)
		localStorage.showTotalBookmarks = 1;

	if (!localStorage.showLabels)
		localStorage.showLabels = 1;
}
	
function fillData(result) {
	if (result != null) {
		docXML = result.documentElement;
		var $nodes = $(docXML).find("bookmark");
		noLoggedIn = false;

		if ($nodes.length == 0) {
		}
		else {
			for (var i = 0; i < $nodes.length; i++)
				bookmarks[i] = GetInfo($nodes[i]);

			lastReadDate = new Date();

			setStorageData();
			updateBadge();
		}
	}
	else {
		noLoggedIn = true;
	}

	switch (currentPage) {
		case "popup":
			ShowBookmarks("");
			break;
		case "options":
			break;
		case "background":
			setBackgroudTimeout();
			break;
	}
}
	
	
function GetBookmarks() {
	bookmarks = new Array();
	console.log("starting ajax call ...");

	if (currentPage == "popup") {
		$("#bookmarks").html("Please wait. Reloading data ... <i class=\"fa fa-spin fa-spinner fa-lg\"></i>");
	}

	$.ajax({
		url: "http://www.google.com/bookmarks",
		dataType: "xml",
		async: true,
		data: "output=xml&num=10000",
		success: function (result) {
			console.log("success fired ...");
			fillData(result);
		},
		fail: function (jqXHR, textStatus) {
			console.log("fail fired ...");
			alert("Error: " + textStatus);
		}
	});
}

function GetInfo(xmlnode) {
	var $xmlnode = $(xmlnode);
	var bookmarkObj = {};
	bookmarkObj.url = $xmlnode.find("url").text();
	bookmarkObj.title = ($xmlnode.find("title").length > 0) ? $xmlnode.find("title").text() : bookmarkObj.url;
	bookmarkObj.timestamp = $xmlnode.find("timestamp").text();
	bookmarkObj.id = $xmlnode.find("id").text();

	var $nodes = $xmlnode.find("label");
	bookmarkObj.labels = [];
	for (var i = 0; i < $nodes.length; i++) {
		bookmarkObj.labels.push($($nodes[i]).html());
	}

	//bookmarkObj.favicon = "images/favicon.gif";

	// REMOVED because it can cause BLOCKED issue (ex: see http://www.htc-club.ro/favicon.ico)
	//var $attributes = $xmlnode.find("attribute");
	//$.each($attributes, function () {
	//	if ($(this).find("name").text() == "favicon_url") {
	//		bookmarkObj.favicon = $(this).find("value").text();
	//		return;
	//	}
	//});
	
	//if (bookmarkObj.favicon == "images/favicon.gif") // default favicon
		bookmarkObj.favicon = "https://www.google.com/s2/u/0/favicons?domain=" + ExtractDomain(bookmarkObj.url);

	return bookmarkObj;
}

function GetLabels() {
	var labels = "";
	for (var i = 0; i < bookmarks.length; i++)
		for (var j = 0; j < bookmarks[i].labels.length; j++) {
			if (("|" + labels + "|").indexOf("|" + bookmarks[i].labels[j] + "|") == -1) {
				if (labels != "")
					labels += "|";
				labels += bookmarks[i].labels[j].replace("|", "/");
			}
		}
	return labels;
}

function FillBookmarks(label) {
	var ret = new Array();
	var total = 0;
	for (var i = 0; i < bookmarks.length; i++)
		for (var j = 0; j < bookmarks[i].labels.length; j++)
			if (bookmarks[i].labels[j].replace("|", "/") == label) {
				ret[total] = bookmarks[i];
				total++;
			}
	return ret;
}
	
function FillUnassignedBookmarks() {
	var ret = new Array();
	var total = 0;
	for (var i = 0; i < bookmarks.length; i++)
		if (bookmarks[i].labels.length == 0) {
			ret[total] = bookmarks[i];
			total++;
		}
	return ret;
}
	
function ExtractDomain(url) {
	url = url.toLowerCase();
	url = url.replace("http://", "");
	url = url.replace("https://", "");
	url = url.replace("ftp://", "");
	return url.split("/")[0];
}

function updateBadge() {
	if (!noLoggedIn) {
		if (localStorage.showTotalBookmarks == 1) {
			chrome.browserAction.setBadgeText({ text: String(bookmarks.length) });
			chrome.browserAction.setBadgeBackgroundColor({ color: [0, 153, 204, 255] });
		}
		else {
			chrome.browserAction.setBadgeText({ text: "" });
		}

		chrome.browserAction.setTitle({ title: "Total bookmarks: " + bookmarks.length + ".\nLast checked on: " + formatToLocalTimeDate(lastReadDate) });
		chrome.browserAction.setIcon({ path: "images/icon_on.png" });
	}
	else {
		chrome.browserAction.setBadgeText({ text: "?" });
		chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
		chrome.browserAction.setTitle({ title: "Not logged in!" });
		chrome.browserAction.setIcon({ path: "images/icon.png" });
	}
}

function CompareNames(a, b) {
	var titlea = Trim(a.title.toLowerCase());
	var titleb = Trim(b.title.toLowerCase());

	var q = Trim($("#query").val().toLowerCase());
	if (q == "") // sort by relevance - position of query
		return (titlea < titleb) ? -1 : 1;
	else {
		if (titlea.indexOf(q) != titleb.indexOf(q)) {
			var inda = parseInt(titlea.indexOf(q));
			var indb = parseInt(titleb.indexOf(q));
			inda = (inda == -1) ? 10000 : inda;
			indb = (indb == -1) ? 10000 : indb;
			return (inda < indb) ? -1 : 1;
		}
		else
			return (titlea < titleb) ? -1 : 1;
	}
}
	
function showUrl(url) {
	chrome.tabs.create({ url: url });
}

function showPopup(url) {
	var add_bookmark_popup = window.open(url, "add_bookmark", "width=620,height=470");
	//add_bookmark_popup.moveTo(,0);
}

function AddBookmark() {
	chrome.tabs.getSelected(null, fCallback);
}

function fCallback(tab) {
	var a = window;
	b = document;
	c = encodeURIComponent;
	showPopup("http://www.google.com/bookmarks/mark?op=edit&output=popup&bkmk=" + c(tab.url) + "&title=" + c(tab.title));
}

function setStorageData() {
	//localStorage.bookmarksData = bookmarks;
	localStorage.setObject("bookmarksData", bookmarks);
	localStorage.lastReadDate = lastReadDate;
	localStorage.noLoggedIn = noLoggedIn;
	localStorage.currentLabel = currentLabel;
}

function getStorageData() {
	//bookmarks = localStorage.bookmarksData;
	bookmarks = localStorage.getObject("bookmarksData");
	lastReadDate = new Date(localStorage.lastReadDate);
	noLoggedIn = (localStorage.noLoggedIn == "true");
	currentLabel = localStorage.currentLabel;
}

Storage.prototype.setObject = function (key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function (key) {
	return this.getItem(key) && JSON.parse(this.getItem(key));
}

// Format to local time from UTC
function formatToLocalTimeDate(inDate) {
	return dateFormat(inDate, "ddd, d mmmm yyyy, h:MM:ss TT");
}

function Trim(str) {
	return str.replace(/^\s+|\s+$/g, '');
}

$(document).ready(function () {
	setDefaultVariables();
});