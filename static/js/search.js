summaryInclude=60;
var fuseOptions = {
  shouldSort: true,
  includeMatches: true,
  threshold: 0.0,
  tokenize:true,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    {name:"title",weight:0.5},
    {name:"contents",weight:0.2},
    {name:"tags",weight:0.1},
    {name:"categories",weight:0.1},
    {name:"image",weight:0.05},
    {name:"section",weight:0.05}
  ]
};

var searchQuery = param("s");
if(searchQuery){
  $("#search-query").val(searchQuery);
  executeSearch(searchQuery);
}else {
  $('#search-results').append("<p>Please enter a word or phrase above</p>");
}

function executeSearch(searchQuery){
  $.getJSON( "/index.json", function( data ) {
    var pages = data;
    var fuse = new Fuse(pages, fuseOptions);
    var result = fuse.search(searchQuery);
    console.log({"matches":result});
    if(result.length > 0){
      populateResults(result);
    }else{
      $('#search-results').append("<p>No matches found</p>");
    }
  });
}

function populateResults(result){
  $.each(result,function(key,value){
    var contents= value.item.contents;
    var snippet = "";
    var snippetHighlights=[];
    var tags =[];
    if( fuseOptions.tokenize ){
      snippetHighlights.push(searchQuery);
    }else{
      $.each(value.matches,function(matchKey,mvalue){
        if(mvalue.key == "tags" || mvalue.key == "categories" ){
          snippetHighlights.push(mvalue.value);
        }else if(mvalue.key == "contents"){
          start = mvalue.indices[0][0]-summaryInclude>0?mvalue.indices[0][0]-summaryInclude:0;
          end = mvalue.indices[0][1]+summaryInclude<contents.length?mvalue.indices[0][1]+summaryInclude:contents.length;
          snippet += contents.substring(start,end);
          snippetHighlights.push(mvalue.value.substring(mvalue.indices[0][0],mvalue.indices[0][1]-mvalue.indices[0][0]+1));
        }
      });
    }

    if(snippet.length<1){
      snippet += contents.substring(0,summaryInclude*2);
    }
    //pull template from hugo templarte definition
    var templateDefinition = $('#search-result-template').html();
    //replace values
    var output = render(templateDefinition,{key:key,title:value.item.title,link:value.item.permalink,tags:value.item.tags,categories:value.item.categories,snippet:snippet, image:value.item.image,section:value.item.section,series:value.item.series});
    $('#search-results').append(output);

    $.each(snippetHighlights,function(snipkey,snipvalue){
      $("#summary-"+key).mark(snipvalue);
    });

  });
}

function param(name) {
    return decodeURIComponent((location.search.split(name + '=')[1] || '').split('&')[0]).replace(/\+/g, ' ');
}

function render(templateString, data) {
  var conditionalMatches;
  var conditionalPattern = /\$\{\s*isset ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  var tagsMatches;
  var tagsPattern = /\$\{\s*tags ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  var seriesMatches;
  var seriesPattern = /\$\{\s*series ([a-zA-Z]*) \s*\}(.*)\$\{\s*end\s*}/g;
  var copy;
  var tagHTML;

  //since loop below depends on re.lastInxdex, we use a copy to capture any manipulations whilst inside the loop
  copy = templateString;

  while ((conditionalMatches = conditionalPattern.exec(templateString)) !== null) {
    if(data[conditionalMatches[1]]){
      //valid key, remove conditionals, leave contents.
      copy = copy.replace(conditionalMatches[0],conditionalMatches[2]);
    } else {
      //not valid, remove entire section
      copy = copy.replace(conditionalMatches[0],'');
    }
  }
  templateString = copy;

  // Next up, replace any tag sections with the appropriate tag items.
  while ((tagsMatches = tagsPattern.exec(templateString)) !== null) {

    copy = copy.replace(tagsMatches[0], convertToTagHtml(data.tags));
  }
  templateString = copy;

  // Next up, replace any tag sections with the appropriate tag items.
  while ((seriesMatches = seriesPattern.exec(templateString)) !== null) {

    copy = copy.replace(seriesMatches[0], convertToSeriesHtml(data.series));
  }
  templateString = copy;

  // Now any conditionals removed we can do simple substitution
  var key, find, re;
  for (key in data) {
    find = '\\$\\{\\s*' + key + '\\s*\\}';
    re = new RegExp(find, 'g');
    templateString = templateString.replace(re, data[key]);
  }
  return templateString;
}

function convertToTagHtml(rawTags){
  var tagsHTML = '';
  if (rawTags != null){
    rawTags.forEach(tag => {
      tagsHTML = tagsHTML + '<span class="badge bg-info text-dark">' + tag + '</span> '
    });
    return tagsHTML;
  }
}

function convertToSeriesHtml(rawSeries){
  var seriesHTML = '';
  if (rawSeries != null){
    rawSeries.forEach(tag => {
      seriesHTML = seriesHTML + '<span class="badge bg-secondary text-dark">' + tag + '</span> '
    });
    return seriesHTML;
  }
}