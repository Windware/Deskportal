
	$self.account = new function()
	{
		var _class = $id + '.account';

		var _active; //Timer for updating folder list for the currently displayed account

		var _cache; //Account list cache

		var _interval = 300; //Interval to update the folder listing

		this.change = function(account) //Change the displayed account
		{
			var log = $system.log.init(_class + '.change');
			if(!$system.is.digit(account)) return log.param();

			__selected.account = account;
			if($system.browser.engine == 'trident') document.body.focus(); //Let focus off the selection to allow mouse wheel use on other parts after selection

			if(account == '0') return $self.folder.get(account);

			var list = function(value) { if($system.is.digit(__special.inbox[value])) $self.folder.change(__special.inbox[value]); } //Get mails for the default mail box
			$self.folder.get(account, 0, $system.app.method(list, [account])); //List the folders

			if(_active) clearInterval(_active);
			if(__account[account].type == 'pop3') return true; //Do not try to update folders from the mail server for POP3

			var update = $system.app.method($self.folder.get, [account, 1]);
			_active = setInterval(update, _interval * 1000); //Get folders updated periodically

			update();
		}

		this.get = function(cache, callback) //Get list of accounts
		{
			var select = $system.node.id($id + '_account');
			var index = select.value || '0'; //Keep the current value

			select.innerHTML = ''; //Clean up the entries

			var language = $system.language.strings($id);
			var defaults = [{key : '0', value : '-----'}];

			for(var i = 0; i < defaults.length; i++) //Create the default options
			{
				var option = document.createElement('option');

				option.value = defaults[i].key;
				$system.node.text(option, defaults[i].value);

				select.appendChild(option);
			}

			var list = function(request)
			{
				$self.gui.indicator(false); //Hide indicator
				_cache = request.xml || request;

				var accounts = $system.dom.tags(_cache, 'account');
				var conf = {account : $system.node.id($id + '_conf_form'), folder : $system.node.id($id + '_conf_folder_form_account')}; //Configuration panel forms

				var choice = {};

				for(var area in conf)
				{
					if(!conf[area]) continue; //If configuration pane is loaded

					conf[area] = conf[area].account; //Account configuration selection box
					choice[area] = conf[area].value; //Keep the selected value

					var start = area == 'account' ? '(' + language['new'] + ')' : '-----';
					conf[area].innerHTML = '<option value="0">' + start + '</option>';
				}

				var selection = [];

				for(var i = 1; i <= __window; i++) //For all of the composing windows
				{
					var form = $system.node.id($id + '_compose_' + i + '_form');
					if(!$system.is.element(form, 'form')) continue;

					selection[i] = form.account.value; //Keep the selection
					form.account.innerHTML = '';
				}

				for(var i = 0; i < accounts.length; i++) //Create the account selection and store the information
				{
					var option = document.createElement('option');
					option.value = $system.dom.attribute(accounts[i], 'id');

					var description = $system.dom.attribute(accounts[i], 'description');
					$system.node.text(option, description);

					select.appendChild(option);
					for(var area in conf) if(conf[area]) conf[area].appendChild(option.cloneNode(true));

					for(var folder in __special) __special[folder][option.value] = $system.dom.attribute(accounts[i], 'folder_' + folder);
					var info = {};

					for(var j = 0; j < accounts[i].attributes.length; j++)
					{
						var point = accounts[i].attributes[j];
						info[point.nodeName] = point.nodeValue;
					}

					info.signature = info.signature.replace(/\\n/g, "\n");
					__account[info.id] = info;

					for(var j = 1; j <= __window; j++) //For all of the composing windows
					{
						if(!$system.window.list[$id + '_display_' + j]) continue; //Check for window existance

						var form = $system.node.id($id + '_compose_' + j + '_form');
						if(!$system.is.element(form, 'form')) continue;
						
						var node = option.cloneNode(true);
						node.appendChild(document.createTextNode(' : ' + info.name + ' (' + info.address + ')'));

						form.account.appendChild(node);
						if(selection[j] == option.value) node.selected = true;
					}
				}

				for(var area in conf) if(conf[area]) conf[area].value = choice[area];

				select.value = index;
				$system.app.callback(_class + '.get.list', callback);
			}

			if(cache === true && _cache) return list(_cache);

			$self.gui.indicator(true); //Show indicator
			return $system.network.send($self.info.root + 'server/php/front.php', {task : 'account.get'}, null, list);
		}

		this.remove = function(id) //Remove an account
		{
			var log = $system.log.init(_class + '.remove');
			if(!$system.is.digit(id)) return log.param();

			var notify = function(request)
			{
				switch($system.dom.status(request.xml))
				{
					case '0' :
						$self.account.get(); //Update account lists
						$self.conf.change(0); //Reset the configuration account

						$system.gui.alert($id, 'user/conf/remove/title', 'user/conf/remove/message', 3);
					break;

					default : $system.gui.alert($id, 'user/conf/error/title', 'user/conf/error/remove', 3); break;
				}
			}

			return $system.network.send($self.info.root + 'server/php/front.php', {task : 'account.remove'}, {id : id}, notify);
		}
	}
