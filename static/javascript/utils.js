var g_TemplateCache;
var g_InFlightTemplates;

function GetTemplate( template, callback ) {
    if ( g_TemplateCache[ template ] )
    {
        callback( g_TemplateCache[ template ] );
        return;
    }
    
    if ( g_InFlightTemplates[ template ] )
    {
        setTimeout( function() { GetTemplate( template, callback ); }, 100 );
        return;
    }
    
    g_InFlightTemplates[ template ] = true;
    $.ajax({
        url: template,
        dataType: "text",
        success: function( contents ) {
            delete g_InFlightTemplates[ template ];
            g_TemplateCache[ template ] = contents;
            callback( g_TemplateCache[ template ] );
        },
        error: function( xhr ) {
            delete g_InFlightTemplates[ template ];
            callback( null );
        }
    });
}

function RenderTemplate( options, callback ) {
    GetTemplate( options.template, function( template ) {
        if ( template == null )
        {
            if ( callback )
            {
                callback( false );
            }
            return;
        }
        
        var result = Mustache.to_html( template, options.data )
        if ( options.append )
        {
            $( options.selector ).append( result );
        }
        else
        {
            $( options.selector ).html( result );
        }
        
        if ( callback )
        {
            callback( true );
        }
        
    });
}
