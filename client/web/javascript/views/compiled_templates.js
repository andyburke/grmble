(function(){dust.register("create_room",body_0);function body_0(chk,ctx){return chk.write("<div class=\"page-header\"><h1>Create Room</h1></div><div class=\"row-fluid\"><div class=\"span9\"><form class=\"form-horizontal\"><fieldset><div class=\"control-group\"><label class=\"control-label\" for=\"name\">Name</label><div class=\"controls\"><input class=\"span7\" id=\"name\" name=\"name\" size=\"30\" type=\"text\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"description\">Description</label><div class=\"controls\"><textarea class=\"span7\" id=\"description\" name=\"description\" rows=\"3\"></textarea></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"tags\">Tags</label><div class=\"controls\"><input class=\"span7\" id=\"tags\" name=\"tags\" size=\"30\" type=\"text\" placeholder=\"eg: cats, robots, llamas\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"protection\">Visibility</label><div class=\"controls\"><select id=\"protection\"><option selected>Public</option><option>Private</option></select></div></div><div class=\"form-actions\"><input type=\"submit\" class=\"btn primary button-create-room\" value=\"Create\"></div></fieldset></form></div><div class=\"extra span3\"><h2>Create a Room</h2><p>You can create your own chat room!</p></div></div>");}return body_0;})();

(function(){dust.register("home",body_0);function body_0(chk,ctx){return chk.write("<div class=\"page-header\"><h1>Grumble <small>An Open Node.js Chat Service</small></h1></div><div class=\"row-fluid\"><div class=\"span8\"><h2>What is Grumble?</h2><p>Grumble is an open chat service using node.js.</p></div></div>  ");}return body_0;})();

(function(){dust.register("manage_room",body_0);function body_0(chk,ctx){return chk.write("<div class=\"page-header\"><h1>").reference(ctx.get("name"),ctx,"h").write("</h1><a href=\"#/Room/").reference(ctx.get("_id"),ctx,"h").write("\">go to room</a></div><div class=\"row-fluid\"><div class=\"span7\"><form class=\"form\"><fieldset><div class=\"control-group\"><label class=\"control-label\" for=\"_id\">Unique ID</label><div class=\"controls\"><input class=\"input-xlarge disabled\" id=\"_id\" name=\"_id\" type=\"text\" value=\"").reference(ctx.get("_id"),ctx,"h").write("\" disabled /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"name\">Name</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"name\" name=\"name\" type=\"text\" value=\"").reference(ctx.get("name"),ctx,"h").write("\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"textarea\">Description</label><div class=\"controls\"><textarea class=\"input-xlarge\" id=\"description\" name=\"description\" rows=\"3\">").reference(ctx.get("description"),ctx,"h").write("</textarea></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"tags\">Tags</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"tags\" name=\"tags\" type=\"text\" value=\"").reference(ctx.get("joinedTags"),ctx,"h").write("\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"protection\">Visibility</label><div class=\"controls\"><select id=\"protection\"><option ").section(ctx.get("isPublic"),ctx,{"block":body_1},null).write(">Public</option><option ").notexists(ctx.get("isPublic"),ctx,{"block":body_2},null).write(">Private</option></select></div></div><div class=\"form-actions\"><button class=\"btn btn-primary update-room-button\" data-loading-text=\"Updating...\" data-complete-text=\"Updated!\">Update</button>&nbsp;<button type=\"reset\" class=\"btn reset-room-button\">Reset</button></div></fieldset></form></div><div class=\"span4\"><h2>Owners</h2><div id=\"ownerlist\">").partial("owner_list",ctx,null).write("</div></div></div>");}function body_1(chk,ctx){return chk.write("selected");}function body_2(chk,ctx){return chk.write("selected");}return body_0;})();

(function(){dust.register("message",body_0);function body_0(chk,ctx){return chk.write("<div id=\"").reference(ctx.get("_id"),ctx,"h").write("\" time=\"").reference(ctx.get("createdAt"),ctx,"h").write("\" class=\"message ").reference(ctx.get("kind"),ctx,"h").write(" ").section(ctx.get("referencesMe"),ctx,{"block":body_1},null).write("\"><div class=\"nickname\">").reference(ctx.get("nickname"),ctx,"h").write("</div><div class=\"avatar-container\"><img class=\"avatar\" src=\"").notexists(ctx.get("avatar"),ctx,{"block":body_2},null).reference(ctx.get("avatar"),ctx,"h").write("\" /></div><div class=\"message-content\">").notexists(ctx.get("processed"),ctx,{"block":body_3},null).reference(ctx.get("processed"),ctx,"h").write("</div></div>");}function body_1(chk,ctx){return chk.write("message-references-me");}function body_2(chk,ctx){return chk.write("/images/icons/user_64x64.png");}function body_3(chk,ctx){return chk.reference(ctx.get("content"),ctx,"h");}return body_0;})();

(function(){dust.register("owner_list",body_0);function body_0(chk,ctx){return chk.write("<table class=\"table table-bordered table-striped\">").section(ctx.get("owners"),ctx,{"block":body_1},null).write("</table><div class=\"pull-right\"><form class=\"form-horizontal\"><input type=\"hidden\" id=\"roomId\" name=\"roomId\" value=\"").reference(ctx.get("_id"),ctx,"h").write("\"/><input class=\"input-large\" type=\"test\" id=\"newowner\" name=\"newowner\" placeholder=\"Add Owner by Entering an Email\"/><button class=\"btn btn-primary add-room-owner-button\" data-loading-text=\"Adding...\" data-complete-text=\"Added!\">Add</button></form></div>");}function body_1(chk,ctx){return chk.write("<tr><td><a href=\"#/User/").reference(ctx.getPath(true,[]),ctx,"h").write("\"><span id=\"").reference(ctx.getPath(true,[]),ctx,"h").write("-nickname\">(no nickname)</span><br/>").reference(ctx.getPath(true,[]),ctx,"h").write("</a></td><td><a href=\"/api/1.0/Room/").reference(ctx.get("_id"),ctx,"h").write("/Owners/").reference(ctx.getPath(true,[]),ctx,"h").write("\" class=\"remove-room-owner-link\">[remove]</a></td></tr>");}return body_0;})();

(function(){dust.register("room",body_0);function body_0(chk,ctx){return chk.write("<div class=\"row-fluid\"><div class=\"room-wrapper\"><div class=\"chatlog-wrapper\"><div class=\"load-more-wrapper\"><button id=\"load-more-button\" class=\"btn\" data-loading-text=\"Loading Older Messages...\">Load Older Messages</button></div><div class=\"chatlog\" id=\"chatlog\"></div></div><div class=\"sidebar-nav-fixed extra\" id=\"sidebar\"><div class=\"sidebar-room-name-wrapper\"><div id=\"room-name\" class=\"room-name\">").reference(ctx.getPath(false,["room","name"]),ctx,"h").write("</div><!-- <button class=\"btn btn-mini btn-warning\" id=\"leave-room\">Leave</button> --></div><hr/><div id=\"userlist\"></div></div></div><div class=\"new-messages-indicator-wrapper\"><i id=\"new-messages-indicator\" class=\"icon-chevron-down hide\"></i></div><div class=\"message-entry-wrapper\"><form id=\"message-entry-form\" class=\"message-entry-form\"><div class=\"row-fluid\"><div class=\"message-entry-content-wrapper\"><textarea id=\"message-entry-content\" class=\"boxsizing-border message-entry-content\" type=\"text\" name=\"content\" autocomplete=\"off\" placeholder=\"\" / autofocus></textarea></div><div class=\"submit-message-wrapper\"><div class=\"submit-message-button-wrapper\"><button id=\"submit-message\" class=\"btn btn-primary btn-large pull-right\" data-loading-text=\"Sending...\">Send</button></div></div></div></form></div></div>");}return body_0;})();

(function(){dust.register("settings",body_0);function body_0(chk,ctx){return chk.write("<div class=\"page-header\"><h1>Settings <small><a href=\"/#/User/").reference(ctx.get("_id"),ctx,"h").write("\">Public Profile &gt;&gt;</a></small></h1></div><div class=\"row-fluid\"><div class=\"span8\"><form class=\"form-horizontal\"><fieldset><div class=\"control-group\"><div class=\"controls\"><img id=\"user-avatar-preview\" width=\"64\" height=\"64\" src=\"").notexists(ctx.get("avatar"),ctx,{"block":body_1},null).reference(ctx.get("avatar"),ctx,"h").write("\"></div></div><div class=\"control-group\"><label class=\"control-label\" for=\"avatar\">Avatar URL</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"avatar\" name=\"avatar\" type=\"text\" value=\"").reference(ctx.get("avatar"),ctx,"h").write("\" /></div><div class=\"controls\"><button class=\"btn btn-small\" id=\"use-avatar-gravatar\" ").notexists(ctx.get("email"),ctx,{"block":body_2},null).write("><img src=\"/images/social/icons/24x24/gravatar.png\" alt=\"Gravatar Avatar\"></button></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"email\">Email</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"email\" name=\"email\" type=\"text\" value=\"").reference(ctx.get("email"),ctx,"h").write("\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"password\">New Password</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"password\" name=\"password\" type=\"password\" value=\"\" /><div class=\"help-block\">Only enter a password here if you want to change your current password.</div></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"nickname\">Nickname</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"nickname\" name=\"nickname\" type=\"text\" value=\"").reference(ctx.get("nickname"),ctx,"h").write("\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"location\">Location</label><div class=\"controls\"><input class=\"input-xlarge\" id=\"location\" name=\"location\" type=\"text\" value=\"").reference(ctx.get("location"),ctx,"h").write("\" placeholder=\"eg: Los Angeles, CA\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"textarea\">Bio</label><div class=\"controls\"><textarea class=\"input-xlarge\" id=\"bio\" name=\"bio\" rows=\"3\">").reference(ctx.get("bio"),ctx,"h").write("</textarea><div class=\"help-block\">Enter a short bio if you please.</div></div></div><!-- /clearfix --><div class=\"form-actions\"><button class=\"btn btn-primary update-account-button\" data-loading-text=\"Updating...\" data-complete-text=\"Updated!\">Update</button>&nbsp;<button type=\"reset\" class=\"btn reset-account-button\">Reset</button></div></fieldset></form></div></div>");}function body_1(chk,ctx){return chk.write("/images/icons/user_64x64.png");}function body_2(chk,ctx){return chk.write("disabled");}return body_0;})();

(function(){dust.register("room_list",body_0);function body_0(chk,ctx){return chk.write("<div class=\"page-header\"><h1>Rooms <small>").reference(ctx.get("subtitle"),ctx,"h").write("</small></h1></div><div class=\"row-fluid\"><div class=\"span8\"><table class=\"zebra-striped\"><tr><th>Room</th><th>Description</tH></tr>").section(ctx.get("rooms"),ctx,{"block":body_1},null).write("</table></div></div>");}function body_1(chk,ctx){return chk.write("<tr><td><a href=\"#/Room/").reference(ctx.get("_id"),ctx,"h").write("\">").reference(ctx.get("name"),ctx,"h").write("</a></td><td>").reference(ctx.get("description"),ctx,"h").write("</td></tr>");}return body_0;})();

(function(){dust.register("signup",body_0);function body_0(chk,ctx){return chk.write("<div class=\"page-header\"><h1>Sign Up <small>Chat with people about cats and robots!</small></h1></div><div class=\"row-fluid\"><div class=\"span3\"><form class=\"form-horizontal\"><fieldset><div class=\"control-group\"><label class=\"control-label\" for=\"email\">Email</label><div class=\"controls\"><input class=\"xlarge\" id=\"email\" name=\"email\" size=\"30\" type=\"text\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"nickname\">Nickname</label><div class=\"controls\"><input class=\"xlarge\" id=\"nickname\" name=\"nickname\" size=\"30\" type=\"text\" /></div></div><!-- /clearfix --><div class=\"control-group\"><label class=\"control-label\" for=\"password\">Password</label><div class=\"controls\"><input class=\"xlarge\" id=\"password\" name=\"password\" size=\"30\" type=\"password\" /></div></div><!-- /clearfix --><div class=\"form-actions\"><input type=\"submit\" class=\"btn btn-primary button-signup\" value=\"Sign Up!\"></div></fieldset></form>Already have an account? Sign in using the navbar above!        </div><div class=\"extra span5\"><h2>Get into chat!</h2><p>You can also use your account to create Rooms and access theAPI!</p></div></div>");}return body_0;})();

(function(){dust.register("userlist_entry",body_0);function body_0(chk,ctx){return chk.write("<div class=\"user\" id=\"userlist-entry-").reference(ctx.get("clientId"),ctx,"h").write("\"><img class=\"user-avatar\" id=\"userlist-entry-avatar-").reference(ctx.get("clientId"),ctx,"h").write("\" src=\"").notexists(ctx.get("avatar"),ctx,{"block":body_1},null).reference(ctx.get("avatar"),ctx,"h").write("\" title=\"").reference(ctx.get("nickname"),ctx,"h").write("\" /><div class=\"userlist-entry-nickname\" id=\"userlist-entry-nickname-").reference(ctx.get("clientId"),ctx,"h").write("\">").reference(ctx.get("nickname"),ctx,"h").write("<span class=\"userlist-entry-typingstatus-normal\" id=\"userlist-entry-typingstatus-").reference(ctx.get("clientId"),ctx,"h").write("\"></span></div></div>");}function body_1(chk,ctx){return chk.write("/images/icons/user_64x64.png");}return body_0;})();